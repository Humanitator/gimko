<script setup>
    import { onMounted, ref } from 'vue';
    import { getAuth } from 'firebase/auth';
    import db from "../firebase/init.js";
    import { doc, addDoc, setDoc, getDoc, getDocs, query, collection, updateDoc, where } from "firebase/firestore";
    import { useRouter } from 'vue-router';

    const router = useRouter();

    // Get trees
    const treeDocs = ref([]); // Tree documents
    const treeCount = ref(1000);
    const getTrees = async () => {
        // Get user
        const auth = getAuth();
        const userRef = doc(db, "users", auth.currentUser.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
            // Get tree id's
            const treeIDs = userDoc.data().trees;
            treeCount.value = treeIDs.length;
            // Get trees
            await treeIDs.forEach(async (tid) => {
                console.log('Getting tree with ID: ' + tid);
                const treeDoc = await getDoc(doc(db, 'trees', tid));
                // Check if exists
                if (treeDoc.exists()) {
                    console.log("Found tree!");
                    treeDocs.value.push(treeDoc);
                } else {
                    console.log("Tree not found!")
                }
            });
        } else {
        // docSnap.data() will be undefined in this case
            console.log("No document for user!");
        }
    };

    // Create a new tree
    const newTreeName = ref("New tree");
    const createTree = async () => {
        if (newTreeName.value === "") {
            newTreeName.value = "New tree";
        }

        const treeColRef = collection(db, 'trees');
        // Check if tree exists
        const q = query(treeColRef, where('name', '==', newTreeName.value));
        const treeDocs = await getDocs(q);
        if (!treeDocs.empty) {
            alert("Tree already exists!");
            return;
        }

        // Make new tree
        const treeObj = {
            name: newTreeName.value,
            people: [],
        };

        const treeRef = await addDoc(treeColRef, treeObj);

        // Get user trees
        const auth = getAuth();
        const userRef = doc(db, "users", auth.currentUser.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            await updateDoc(userRef, {
                trees: [...userDoc.data().trees, treeRef.id],
            });
            router.go(); // Reload page
        } else {
        // docSnap.data() will be undefined in this case
            console.log("No document for user!");
        }
    };

    // Load a tree
    const loadTree = (ID) => {
        router.push({ name: "tree", params: { id: ID}})
    };

    onMounted(() => {
        document.title = "gimko | Trees";
        getTrees();
    });
</script>

<template>
    <div v-if="treeDocs.length != treeCount">
        <h1>Getting tees</h1>
    </div>
    <!-- If tree docs -->
    <div v-if="treeDocs.length == treeCount">
        <h1>Trees</h1>
    
        <div class="tree-list-container">
            <button class="tree-button hover-up-p" v-for="treeDoc in treeDocs" @click="loadTree(treeDoc.id)">
                <p>{{ treeDoc.data().name }}</p>
                <div class="bg accent"></div>
            </button>
        </div>
    
        <div class="new-tree-container">
            <h2>Make a new tree</h2>
            <p>Name:</p>
            <p><input type="text" v-model="newTreeName" placeholder="New tree"></p>
    
            <button class="hover-up-p" @click="createTree">
                <p>Create tree</p>
            </button>

            <div class="bg"></div>
        </div>
    </div>
</template>

<style lang="scss">
    @import "../assets/css/treeMain.scss";
</style>