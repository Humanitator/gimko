<script setup>
    import db from '@/firebase/init';
import { async } from '@firebase/util';
    import { getAuth } from 'firebase/auth';
    import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
    import { onMounted, ref } from 'vue';

    // Get current user
    const user = ref();
    const getUser = async () => {
        console.log("Getting user!");
        const auth = getAuth();
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
            console.log("Got user!");
            user.value = userDoc.data();
        } else {
            console.log("User not found!");
        }
    }

    const getPersonDoc = async (pid) => {
        const personDoc = await getDoc(doc(db, "users", pid));
        if (personDoc.exists()) {
            return personDoc;
        }
    };

    // Find a person by username
    const getPersonByUsername = async (username) => {
        const q = query(collection(db, "users"), where("username", "==", username));
        const people = await getDocs(q);
        const peopleData = [];
        people.forEach((person) => {
            console.log(person);
            peopleData.push(person);
        });
        return peopleData[0];
    };
    
    // Search for a person
    const usernameQuery = ref("");
    const queryResults = ref();
    const searchPerson = async () => {
        await getPersonByUsername(usernameQuery.value)
        .then((people) => {
            queryResults.value = [people];
        });
    }

    const selectedPerson = ref();

    // Send a friend request
    const sendFriendRequest = async (pid) => {
        const auth = getAuth();
        let person = (await getPersonDoc(pid)).data();
        await updateDoc(doc(db, "users", pid), {
            friendRequests: [...person.friendRequests, auth.currentUser.uid],
        });

        // Update local user ref
        user.value.pendingRequests.push(pid);

        // Update DB user
        await updateDoc(doc(db, "users", auth.currentUser.uid), {
            pendingRequests: [...user.value.pendingRequests],
        });

        console.log("Sent friend request");
    };

    // Accept friend request
    const acceptFriendRequest = async (pid) => {
        const auth = getAuth();
        const person = getPersonDoc(pid).data();

        // Remove from requests
        const userFRQ = [...user.value.friendRequests];
        userFRQ.splice(userFRQ.indexOf(pid), 1);
        
        // Update local user ref
        user.value.friendRequests = [...userFRQ];
        user.value.friends.push(pid);

        // Update DB user
        await updateDoc(doc(db, "users", auth.currentUser.uid), {
            friendRequests: [...userFRQ],
            friends: [...user.value.friends],
        });

        // Remove from pending
        const perosnPRQ = [...person.pendingRequests];
        perosnPRQ.splice(perosnPRQ.indexOf(auth.currentUser.uid), 1);

        await updateDoc(doc(db, "users", pid), {
            pendingRequests: [],
            friends: [...person.friends, auth.currentUser.uid],
        });
    }

    // Add a person to tree
    const addingToTree = ref(false);
    const addToTree = async (pid, tid) => {
        const person = getPersonDoc(pid).data();
        await updateDoc(doc(db, "users", pid), {
            trees: [...person.trees, tid],
        });
    }

    // Dialog bools
    const requestDialogOpen = ref(false);
    const addToTreeDialogOpen = ref(false);

    // Close all dialogs
    const closeDialogs = () => {
        selectedPerson.value = null;
        requestDialogOpen.value = false
    };

    // When mounted
    onMounted(() => {
        document.title = "gimko | People"
        getUser();
    });
</script>

<template>
    <h1>People</h1>

    <!-- Page placeholder while getting data -->
    <div v-if="!user">
        <div class="username-query-container">
            <div class="bg"></div>
        </div>

        <div class="friend-list-container">
            <h2>Friends</h2>
            <div class="friend-selector">
                <div class="friend-button hover-up" v-for="i in Array(5).keys()">
                    <div class="bg op-20"></div>
                </div>
            </div>
        </div>
    </div>

    <!-- Page view -->
    <div v-if="user">
        <!-- Search query results -->
        <div class="search-result-container" v-if="queryResults">
            <h2>Search results:</h2>
            <div class="search-result" v-for="person in queryResults">
                <h2>{{ person.data().username }}</h2>

                <div class="search-result-buttons">
                    <!-- Add friend -->
                    <button 
                        class="hover-up-p" 
                        @click="sendFriendRequest(person.id)" 
                        v-if="!user.friends.includes(person.id) && !user.pendingRequests.includes(person.id)"
                    >
                        <p>ADD FRIEND</p>
                        <div class="bg op-30"></div>
                    </button>
                    <!-- Accept friend request -->
                    <button 
                        class="hover-up-p" 
                        @click="acceptFriendRequest(person.id)" 
                        v-if="user.friendRequests.includes(person.id)"
                    >
                        <p>ACCEPT FRIEND REQUEST</p>
                        <div class="bg op-30"></div>
                    </button>
                    <!-- Add to tree -->
                    <button 
                        class="hover-up-p" 
                        @click="() => {addToTreeDialogOpen = true; selectedPerson = person.id}" 
                        v-if="user.friends.includes(person.id)"
                    >
                        <p>ADD TO TREE</p>
                        <div class="bg op-30"></div>
                    </button>
                    <div class="bg op-30"></div>
                </div>

                <div class="bg op-100"></div>
            </div>
        </div>

        <!-- Search for a person -->
        <div class="username-query-container">
            <h2>Search for someone</h2>
            <p>Enter a username: <input v-model="usernameQuery" type="text" /></p>
            <button class="hover-up-p" @click="searchPerson()">
                <p>Search</p>
                <div class="bg accent"></div>
            </button>
            <div class="bg"></div>
        </div>

        <!-- Add to tree -->
        <div class="add-to-tree">
            <div class="tree-selector">

            </div>
        </div>

        <!-- Accept friend request -->
            <!-- Button -->
        <button class="requests-button hover-up-p" @click="() => requestDialogOpen = true" v-bind:class="(!requestDialogOpen)?'shown-0-0':''">
            <p>Friend requests</p>
            <div class="bg accent op-50"></div>
        </button>
            <!-- Dialog -->
        <div class="requests-container" v-bind:class="(requestDialogOpen)?'shown-0-0':''">
            <div class="friend-requests">
                <h2>Incoming requests:</h2>
                <div v-for="request in user.friendRequests">
                    <div class="request">
                        <p></p>
                        <button class="hover-up-p">
                            <p>X</p>
                            <div class="bg"></div>
                        </button>
                        <button class="hover-up-p">
                            <p>Y<img src="" alt=""></p>
                            <div class="bg"></div>
                        </button>
                    </div>
                </div>
                <p v-if="!user.friendRequests || user.friendRequests.length == 0">No incoming requests...</p>
            </div>
            <div class="pending-requests">
                <h2>Sent requests:</h2>
                <div v-for="request in user.pendingRequests">
                    {{ request }}
                </div>
                <p v-if="!user.pendingRequests || user.pendingRequests.length == 0"> No sent requests...</p>
            </div>

            <button class="close-button z-10 hover-up-p" @click="closeDialogs()">
                <p>Close</p>
                <div class="bg op-30"></div>
            </button>

            <div class="bg"></div>
        </div>

        <!-- Friends list -->
        <div class="friend-list-container">
            <h2>Friends</h2>
            <div class="friend-selector">
                <button class="friend-button hover-up-p" @click="loadPerson(friend)" v-for="friend in user.friends">
                    <p>{{ treeDoc.data().name }}</p>
                    <div class="bg op-20"></div>
                </button>
            </div>

            <!-- If friends is empty -->
            <div v-if="user.friends.length == 0">
                <img class="lonely" src="../assets/img/lonely_1280x853.jpg">
                <p>Lonely...</p>
            </div>
        </div>
    </div>

</template>

<style scoped lang="scss">
    @import "../assets/css/people.scss";
    @import "../assets/css/base.scss";
    @import "../assets/css/colors.scss";
</style>