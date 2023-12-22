<script setup>
    import { onMounted, ref } from 'vue';
    import { getAuth } from 'firebase/auth';
    import db from "../firebase/init.js";
    import { defaultTree } from "../firebase/defaultStructs"
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
    const creatingTree = ref(false);
    const newTreeName = ref("Jauns koks");
    const createTree = async () => {
        const auth = getAuth();
        creatingTree.value = true;
        if (newTreeName.value === "") {
            newTreeName.value = "Jauns koks";
        }

        const treeColRef = collection(db, 'trees');
        // Check if tree exists
        const q = query(treeColRef, where('name', '==', newTreeName.value));
        const treeDocs = await getDocs(q);
        if (!treeDocs.empty) {
            alert("Šāds koks jau pastāv!");
            return;
        }

        // Make new tree
        const treeObj = structuredClone(defaultTree);
        treeObj.name = newTreeName.value;
        treeObj.ownerID = auth.currentUser.uid;

        const treeRef = await addDoc(treeColRef, treeObj);

        // Get user trees
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
        document.title = "gimko | Koki";
        getTrees();
    });
</script>

<template>
    <h1>Koki</h1>

    <!-- Render placeholders while retrieving data from firebase -->
    <div v-if="treeDocs.length != treeCount">
        <div class="tree-list-container">
            <div class="tree-selector">
                <div class="tree-button hover-up" v-for="i in Array(5).keys()">
                    <div class="bg op-20"></div>
                </div>
            </div>
            <div class="bg"></div>
        </div>

        <div class="new-tree-container">
            <div class="bg"></div>
        </div>
    </div>

    <!-- If tree docs -->
    <div v-if="treeDocs.length == treeCount">
    
        <div class="tree-list-container">
            <div class="tree-selector">
                <button class="tree-button hover-up-p" @click="loadTree(treeDoc.id)" v-for="treeDoc in treeDocs">
                    <p>{{ treeDoc.data().name }}</p>
                    <div class="bg op-20"></div>
                </button>
            </div>
            <div class="bg"></div>
        </div>
    
        <div class="new-tree-container">
            <h2>Izveidot Jaunu Koku</h2>
            <p>Nosaukums:</p>
            <p><input type="text" v-model="newTreeName" placeholder="New tree"></p>
    
            <button v-if="!creatingTree" class="hover-up-p" @click="createTree()">
                <p>Izveidot Koku</p>
            </button>

            <div class="bg"></div>
        </div>
    </div>
</template>

<style scoped lang="scss">
    @import "../assets/css/treeMain.scss";
</style>