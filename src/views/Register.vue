<script setup>
    import { onMounted, ref } from 'vue';
    import db from "../firebase/init.js"
    import {
        getAuth,
        createUserWithEmailAndPassword,
        GoogleAuthProvider,
        signInWithPopup,
    } from "firebase/auth";
    import { doc, collection, addDoc, setDoc, getDoc} from "firebase/firestore"
    import { useRouter } from 'vue-router';

    const email = ref("");
    const password = ref("");
    const router = useRouter(); // Get a refrence to router
    const errorMsg = ref();

    const register = () => {
        // Need .value because ref()
        const auth = getAuth();
        createUserWithEmailAndPassword(auth, email.value, password.value)
        .then(async (data) => {
            console.log("Successfully registered!");
            console.log("Id" + data.user.uid);
            // Add user to database
            await setDoc(doc(db, 'users', data.user.uid), {
                trees: [],
            });

            // Move user to home
            router.push('/');
        })
        .catch((error) => {
            console.log(error.code);
            switch (error.code) {
                case "auth/invalid-email":
                    errorMsg.value = "Invalid Email";
                    break;
                case "auth/user-not-found":
                    errorMsg.value = "No account with that email was found";
                    break
                case "auth/wrong-password":
                    errorMsg.value = "Incorrect password";
                    break;
                case "auth/missing-password":
                    errorMsg.value = "Missing password";
                    break
                case "auth/email-already-in-use":
                    errorMsg.value = "Email is already in use";
                    break;
                default:
                    errorMsg.value = "Something went wrong, try changing the password or email.";
                    break;
            }
        });
    };

    const signInWithGoogle = () => {
        const provider = new GoogleAuthProvider();
        signInWithPopup(getAuth(), provider)
        .then(async (result) => {
            console.log(result.user);
            // Check if user exists
            const uDoc = await getDoc(doc(db, 'users', result.user.uid))
            if (!uDoc.exists()) {
                await setDoc(doc(db, 'users', result.user.uid), {
                    trees: [],
                });
            };

            router.push("/");
        })
        .catch((error) => {
            // Handle error
        });
    };

    onMounted(() => {
        document.title = "gimko | Register";
    });
</script>

<template>
    <h1>Create an account</h1>

    <article>
        <p><input type="text" placeholder="Email" v-model="email"/></p>
        <p><input type="password" placeholder="Password" v-model="password"/></p>
        <p v-if="errorMsg">{{ errorMsg }}</p>
        <p><button @click="register">Submit</button></p>

        <p><button @click="signInWithGoogle">Sign in with Google</button></p>
    </article>
</template>

<style lang="scss">
     @import '../assets/css/signIn.scss';
</style>