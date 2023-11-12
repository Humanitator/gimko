<script setup>
    import db from '@/firebase/init';
    import { async } from '@firebase/util';
    import { safeUpdateDoc } from '@/firebase/fbEasy'
    import { getAuth } from 'firebase/auth';
    import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
    import { onMounted, ref } from 'vue';

    // Get current user
    const user = ref();
    const auth = ref();
    const getUser = async () => {
        console.log("Getting user!");
        auth.value = getAuth();
        const userDoc = await getDoc(doc(db, "users", auth.value.currentUser.uid));
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

    // Get friend requests
    const incomingFriendReq = ref([]);
    const sentFriendReq = ref([]);
    const getFriendRequests = () => {
        // Get incoming
        user.value.incomingFriendReq.forEach( async (reqID) => {
            const person = await getPersonDoc(reqID);
            incomingFriendReq.value.push(person.data());
        });
        // Get sent
        user.value.sentFriendReq.forEach( async (reqID) => {
            const person = await getPersonDoc(reqID);
            sentFriendReq.value.push(person.data());
        });
    }

    // Send a friend request
    const sendFriendRequest = async (pid) => {
        let person = (await getPersonDoc(pid)).data();
        await updateDoc(doc(db, "users", pid), {
            incomingFriendReq: [...person.sentFriendReq, auth.value.currentUser.uid],
        });

        // Update local user ref
        user.value.sentFriendReq.push(pid);

        // Update DB user
        await updateDoc(doc(db, "users", auth.value.currentUser.uid), {
            sentFriendReq: [...user.value.sentFriendReq],
        });

        // Add to local ref
        sentFriendReq.value.push(person);

        console.log("Sent friend request");
    };

    // Accept friend request
    const acceptFriendRequest = async (pid) => {
        const person = (await getPersonDoc(pid)).data();

        // Remove from local ref
        incomingFriendReq.value.splice(user.value.incomingFriendReq.indexOf(pid), 1);

        // Remove from local user requests
        user.value.incomingFriendReq.splice(user.value.incomingFriendReq.indexOf(pid), 1);
        
        // Update local user friends
        user.value.friends.push(pid);

        // Update DB user
        await updateDoc(doc(db, "users", auth.value.currentUser.uid), {
            incomingFriendReq: [...user.value.incomingFriendReq],
            friends: [...user.value.friends],
        });

        // Remove from local person
        person.sentFriendReq.splice(person.sentFriendReq.splice(auth.value.currentUser.uid), 1);

        await updateDoc(doc(db, "users", pid), {
            sentFriendReq: [...person.sentFriendReq],
            friends: [...person.friends, auth.value.currentUser.uid],
        });
    };

    // Deny friend request
    const denyFriendRequest = async (pid) => {
        const person = (await getPersonDoc(pid)).data();

        // Remove from local ref
        incomingFriendReq.value.splice(user.value.incomingFriendReq.indexOf(pid), 1);

        // Remove on local
        person.sentFriendReq.splice(person.sentFriendReq.indexOf(auth.value.currentUser.uid));
        user.value.incomingFriendReq.splice(person.incomingFriendReq.indexOf(pid));

        // Remove from person
        safeUpdateDoc('/users', pid, { sentFriendReq: [ ...person.sentFriendReq] });

        // Remove from user
        safeUpdateDoc('/users', auth.value.currentUser.uid, { incomingFriendReq: [ ...user.value.incomingFriendReq] });
    };

    // Cancel a sent friend request
    const cancelFriendRequest = async (pid) => {
        const person = (await getPersonDoc(pid)).data();

        // Remove from local ref
        sentFriendReq.value.splice(user.value.sentFriendReq.indexOf(pid), 1);

        // Remove on local
        person.incomingFriendReq.splice(person.incomingFriendReq.indexOf(auth.value.currentUser.uid), 1);
        user.value.sentFriendReq.splice(user.value.sentFriendReq.splice(pid), 1);

        // Remove from person
        safeUpdateDoc('/users', pid, { incomingFriendReq: [...person.incomingFriendReq] });
        
        // Remove from user
        safeUpdateDoc('/users', auth.value.currentUser.uid, { sentFriendReq: [...user.value.sentFriendReq] });
    };

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
    onMounted(async () => {
        document.title = "gimko | People"
        await getUser();
        getFriendRequests();
        console.log(user.value);
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
        <h2>Hello, {{ user.username }}!</h2>
        <!-- Search query results -->
        <div class="search-result-container" v-if="queryResults">
            <h2>Search results:</h2>
            <div class="search-result" v-for="person in queryResults">
                <h2>{{ person.data().username }}</h2>

                <div class="search-result-buttons">
                    <!-- If self -->
                    <h2 v-if="person.id == auth.currentUser.uid">
                        This is You!
                    </h2>
                    <!-- Add friend / Send friend request -->
                    <button 
                        class="hover-up-p" 
                        @click="sendFriendRequest(person.id)" 
                        v-if="!user.friends.includes(person.id) && !user.incomingFriendReq.includes(person.id) && !user.sentFriendReq.includes(person.id) && auth.currentUser.uid != person.id"
                    >
                        <p>ADD FRIEND</p>
                        <div class="bg op-30"></div>
                    </button>
                    <!-- Accept friend request -->
                    <button 
                        class="hover-up-p" 
                        @click="acceptFriendRequest(person.id)" 
                        v-if="user.incomingFriendReq.includes(person.id)"
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
                <div v-for="personID, i in user.incomingFriendReq" v-if="incomingFriendReq.length > 0">
                    <div class="request">
                        <p>{{ incomingFriendReq[i].username }}
                            <button class="hover-up-p" @click="denyFriendRequest(personID)">
                                <p>X</p>
                                <div class="bg"></div>
                            </button>
                            <button class="hover-up-p" @click="acceptFriendRequest(personID)">
                                <p>Y</p>
                                <div class="bg"></div>
                            </button>
                        </p>
                    </div>
                </div>
                <p v-if="!user.incomingFriendReq || user.incomingFriendReq.length == 0">No incoming requests...</p>
            </div>
            <div class="pending-requests">
                <h2>Sent requests:</h2>
                <div v-for="personID, i in user.sentFriendReq" v-if="sentFriendReq.length > 0">
                    <div class="request">
                        <p>{{ sentFriendReq[i].username }}
                            <button class="hover-up-p" @click="cancelFriendRequest(personID)">
                                <p>Cancel</p>
                                <div class="bg"></div>
                            </button>
                        </p>
                    </div>
                </div>
                <p v-if="!user.sentFriendReq || user.sentFriendReq.length == 0"> No sent requests...</p>
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