<script setup>
    import db from '@/firebase/init';
    import { async } from '@firebase/util';
    import { safeUpdateDoc, safeGetDoc } from '@/firebase/fbEasy'
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
    };

    const userTrees = ref([]);
    const getUserTrees = async () => {
        await user.value.trees.forEach( async (treeID) => {
            userTrees.value.push((await safeGetDoc('/trees', treeID)).data());
        });
    };

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
    const selectedPersonID = ref();

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
        console.log("Set incoming");
        await updateDoc(doc(db, "users", pid), {
            'incomingFriendReq': [...person.sentFriendReq, auth.value.currentUser.uid],
        });

        // Update local user ref
        user.value.sentFriendReq.push(pid);

        console.log("Set sent");
        // Update DB user
        await updateDoc(doc(db, "users", auth.value.currentUser.uid), {
            'sentFriendReq': [...user.value.sentFriendReq],
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

        // Add to local friends
        friends.value.push(person);

        // Remove from local user requests
        user.value.incomingFriendReq.splice(user.value.incomingFriendReq.indexOf(pid), 1);
        
        // Update local user friends
        user.value.friends.push(pid);

        // Update DB user
        await updateDoc(doc(db, "users", auth.value.currentUser.uid), {
            'incomingFriendReq': [...user.value.incomingFriendReq],
            'friends': [...user.value.friends],
        });

        // Remove from local person
        person.sentFriendReq.splice(person.sentFriendReq.splice(auth.value.currentUser.uid), 1);

        await updateDoc(doc(db, "users", pid), {
            'sentFriendReq': [...person.sentFriendReq],
            'friends': [...person.friends, auth.value.currentUser.uid],
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
        safeUpdateDoc('/users', pid, { 'sentFriendReq': [ ...person.sentFriendReq] });

        // Remove from user
        safeUpdateDoc('/users', auth.value.currentUser.uid, { 'incomingFriendReq': [ ...user.value.incomingFriendReq] });
    };

    // Cancel a sent friend request
    const cancelFriendRequest = async (pid) => {
        const person = (await getPersonDoc(pid)).data();

        // Remove from local ref
        sentFriendReq.value.splice(user.value.sentFriendReq.indexOf(pid), 1);

        // Remove on local
        person.incomingFriendReq.splice(person.incomingFriendReq.indexOf(auth.value.currentUser.uid), 1);
        user.value.sentFriendReq.splice(user.value.sentFriendReq.indexOf(pid), 1);

        // Remove from person
        safeUpdateDoc('/users', pid, { 'incomingFriendReq': [...person.incomingFriendReq] });
        
        // Remove from user
        safeUpdateDoc('/users', auth.value.currentUser.uid, { 'sentFriendReq': [...user.value.sentFriendReq] });
    };

    // Get friends
    const friends = ref([]);
    const getFriends = () => {
        user.value.friends.forEach(async (fid) => {
            const friend = await safeGetDoc('/users', fid);
            friends.value.push(friend.data());
        });
    };

    // Remove a friend
    const removeFriend = async (pid) => {
        const person = (await safeGetDoc('/users', pid)).data()

        // Remove on local
        person.friends.splice(person.friends.indexOf(auth.value.currentUser.uid), 1);
        user.value.friends.splice(user.value.friends.indexOf(pid), 1);
        
        // Remove in person
        safeUpdateDoc('/users', pid, { 'friends': [...person.friends]})

        // Remove in user
        safeUpdateDoc('/users', auth.value.currentUser.uid, { 'friends': [...user.value.friends] });
    };

    // Load person data
    const loadPerson = async (pid) => {
        const person = (await safeGetDoc('/users', pid)).data();

        selectedPerson.value = person;
        selectedPersonID.value = pid;
    };

    // Add a person to tree
    const addToTree = async (pid, tid) => {
        const person = (await getPersonDoc(pid)).data();
        await updateDoc(doc(db, "users", pid), {
            'trees': [...person.trees, tid],
        });

        location.reload();
    };

    // Remove a person from tree
    const removeFromTree = async (pid, tid) => {
        const person = (await getPersonDoc(pid)).data();
        person.trees.splice(person.trees.indexOf(tid), 1);
        await updateDoc(doc(db, "users", pid), {
            'trees': [...person.trees],
        });

        location.reload();
    };

    // Dialog bools
    const requestDialogOpen = ref(false);
    const addToTreeDialogOpen = ref(false);

    // Close all dialogs
    const closeDialogs = () => {
        selectedPerson.value = null;
        selectedPersonID.value = null;
        requestDialogOpen.value = false;
    };

    // When mounted
    onMounted(async () => {
        document.title = "gimko | Cilvēki"
        await getUser();
        getFriendRequests();
        await getUserTrees();
        getFriends();
        console.log(user.value);
    });
</script>

<template>
    <h1>Cilvēki</h1>

    <!-- Page placeholder while getting data -->
    <div v-if="!user">
        <div class="username-query-container">
            <div class="bg"></div>
        </div>

        <div class="friend-list-container">
            <h2>Draugi</h2>
            <div class="friend-selector">
                <div class="friend-button hover-up" v-for="i in Array(5).keys()">
                    <div class="bg op-20"></div>
                </div>
            </div>
        </div>
    </div>

    <!-- Page view -->
    <div v-if="user">
        <h2>Sveiks, {{ user.username }}!</h2>
        <!-- Search query results -->
        <div class="search-result-container" v-if="queryResults">
            <h2>Meklēšanas rezultāti:</h2>
            <div class="search-result" v-for="person in queryResults">
                <h2>{{ person.data().username }}</h2>

                <div class="search-result-buttons">
                    <!-- If self -->
                    <h2 v-if="person.id == auth.currentUser.uid">
                        Šis esi Tu!
                    </h2>
                    <!-- Add friend / Send friend request -->
                    <button 
                        class="hover-up-p" 
                        @click="sendFriendRequest(person.id)" 
                        v-if="!user.friends.includes(person.id) && !user.incomingFriendReq.includes(person.id) && !user.sentFriendReq.includes(person.id) && auth.currentUser.uid != person.id"
                    >
                        <p>PIEVIENOT DRAUGU</p>
                        <div class="bg op-30"></div>
                    </button>
                    <!-- Accept friend request -->
                    <button 
                        class="hover-up-p" 
                        @click="acceptFriendRequest(person.id)" 
                        v-if="user.incomingFriendReq.includes(person.id)"
                    >
                        <p>PIEŅEMT DRAUGA PIEPRASĪJUMU</p>
                        <div class="bg op-30"></div>
                    </button>
                    <!-- Add to tree -->
                    <button 
                        class="hover-up-p" 
                        @click="() => {
                            addToTreeDialogOpen = true;
                            selectedPerson = person.data();
                            selectedPersonID = person.id;
                            loadPerson(person.id);
                        }" 
                        v-if="user.friends.includes(person.id)"
                    >
                        <p>PIEVIENOT KOKAM</p>
                        <div class="bg op-30"></div>
                    </button>
                    <div class="bg op-30"></div>
                </div>

                <div class="bg op-100"></div>
            </div>
        </div>

        <!-- Search for a person -->
        <div class="username-query-container">
            <h2>Meklēt kādu</h2>
            <p>Ievadi lietotājvārdu: <input v-model="usernameQuery" type="text" /></p>
            <button class="hover-up-p" @click="searchPerson()">
                <p>Meklēt</p>
                <div class="bg accent"></div>
            </button>
            <div class="bg"></div>
        </div>

        <!-- Person info -->
        <div class="person-info z-10" v-bind:class="(!selectedPerson)?'hidden-left--50':''">
            <h2 v-if="selectedPerson">{{ selectedPerson.username }}</h2>
            <!-- Add to tree -->
            <div class="add-to-tree" v-if="addToTreeDialogOpen && selectedPerson">
                <h3 style="text-align: center;">Pievienot kokam</h3>
                <div class="tree-selector">
                    <div v-for="tree, i in userTrees" class="user-tree">
                        <p>{{ tree.name }}</p>
                        
                        <p>
                            <button 
                                class="hover-up-p add-to-tree-btn" 
                                @click="addToTree(selectedPersonID, user.trees[i])"
                                v-if="!selectedPerson.trees.includes(user.trees[i])"
                                >
                                <p>PIEVIENOT</p>
                                <div class="bg op-30"></div>
                            </button>
                            <button
                                class="hover-up-p add-to-tree-btn"
                                @click="removeFromTree(selectedPersonID, user.trees[i])"
                                v-if="selectedPersonID == tree.ownerID && selectedPerson.trees.includes(user.trees[i])"
                                >
                                <p>NOŅEMT</p>
                                <div class="bg op-30"></div>
                            </button>
                        </p>

                        <div class="bg op-20"></div>
                    </div>
                    <p v-if="userTrees.length == 0" style="text-align: center; width: 100%;">No trees</p>
                </div>

                <div class="bg op-20"></div>
            </div>
            <!-- Add to tree button -->
            <button class="hover-up-p" v-if="!addToTreeDialogOpen" @click="() => addToTreeDialogOpen = true">
                <p>Pievienot Kokam</p>
                <div class="bg"></div>
            </button>

            <button class="close-button hover-up-p" @click="closeDialogs()">
                <p>Aizvērt</p>
                <div class="bg op-20"></div>
            </button>
        </div>

        <!-- Accept friend request -->
            <!-- Button -->
        <button class="requests-button hover-up-p" @click="() => requestDialogOpen = true" v-bind:class="(!requestDialogOpen)?'shown-0-0':''">
            <p>Drauga pieprasījumi</p>
            <div class="bg accent op-50"></div>
        </button>
            <!-- Dialog -->
        <div class="requests-container" v-bind:class="(requestDialogOpen)?'shown-0-0':''">
            <div class="friend-requests">
                <h3>Ienākošie pieprasījumi:</h3>
                <div v-for="personID, i in user.incomingFriendReq" v-if="incomingFriendReq.length > 0">
                    <div class="request">
                        <p>{{ incomingFriendReq[i].username }}
                            <button class="hover-up-p" @click="denyFriendRequest(personID)">
                                <p>Noraidīt</p>
                                <div class="bg"></div>
                            </button>
                            <button class="hover-up-p" @click="acceptFriendRequest(personID)">
                                <p>Pieņemt</p>
                                <div class="bg"></div>
                            </button>
                        </p>
                    </div>
                </div>
                <p v-if="!user.incomingFriendReq || user.incomingFriendReq.length == 0">Nav ienākošu pieprasījumu...</p>
            </div>
            <div class="pending-requests">
                <h3>Sūtītie pieprasījumi:</h3>
                <div v-for="personID, i in user.sentFriendReq" v-if="sentFriendReq.length > 0">
                    <div class="request">
                        <p>{{ sentFriendReq[i].username }}
                            <button class="hover-up-p" @click="cancelFriendRequest(personID)">
                                <p>Atcelt</p>
                                <div class="bg"></div>
                            </button>
                        </p>
                    </div>
                </div>
                <p v-if="!user.sentFriendReq || user.sentFriendReq.length == 0"> Nav sūtītu pieprasījumu...</p>
            </div>

            <button class="close-button z-10 hover-up-p" @click="closeDialogs()">
                <p>Aizvērt</p>
                <div class="bg op-30"></div>
            </button>

            <div class="bg secondary op-40"></div>
        </div>

        <!-- Friends list -->
        <div class="friend-list-container">
            <h1>Draugi</h1>
            <div class="friend-selector" v-if="friends.length > 0">
                <div class="friend-panel" v-for="friendID, i in user.friends">
                    <h2>{{ friends[i].username }}</h2>
                    <button class="hover-up-p info" @click="loadPerson(friendID)">
                        <p>Info</p>
                        <div class="bg op-50"></div>
                    </button>
                    <button class="hover-up-p z-5" @click="removeFriend(friendID)">
                        <p>Noņemt draugu</p>
                        <div class="bg red op-50"></div>
                    </button>
                    <div class="bg op-20"></div>
                </div>
            </div>

            <!-- If friends is empty -->
            <div v-if="user.friends.length == 0">
                <img class="lonely" src="../assets/img/lonely_1280x853.jpg">
                <p>Vientuļi...</p>
            </div>
        </div>
    </div>

</template>

<style scoped lang="scss">
    @import "../assets/css/people.scss";
    @import "../assets/css/base.scss";
    @import "../assets/css/colors.scss";
</style>