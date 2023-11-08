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
import { async } from '@firebase/util';

    const username = ref("");
    const email = ref("");
    const password = ref("");

    const router = useRouter(); // Get a refrence to router
    const errorMsg = ref();

    // Check if username is in use
    const checkUsername = async () => {
        // Check if username is valid
        const regexPattern = /^[a-zA-Z0-9]+$/; // Allows only letters and numbers

        if (username.value.length < 3 || username.value.length > 16) {
            errorMsg.value = "Username must be between 3 and 16 charachters long!";
            return false;
        } else if (!regexPattern.test(username.value)) {
            errorMsg.value = "Username must only include letters or numbers!";
            return false;
        }

        // Check if username exists
        const existingUser = await getDoc(doc(db, "users", username.value));
        if (existingUser.exists()) {
            errorMsg.value = "Username already is in use!"
            return false;
        }

        return true;
    };

    const registering = ref(false);
    const register = () => {
        registering.value = true;
        console.log("Registering...");
        // Need .value because ref()
        const auth = getAuth();
        // Validate username
        checkUsername()
        .then( (isValid) => {
            if (!isValid) {
                // Username is not valid
                console.log("Username not valid");
                registering.value = false
                return
            }
            console.log("Username valid!");
            // Create user
            createUserWithEmailAndPassword(auth, email.value, password.value)
            .then(async (data) => {
                console.log("Successfully registered!");
                console.log("Id" + data.user.uid);
                // Add user to database
                await setDoc(doc(db, 'users', data.user.uid), {
                    username: username.value,
                    friends: [],
                    friendRequests: [],
                    pendingRequests: [],
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
        });
    };

    // Get user document
    const getUser = async (uid) => {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
            return userDoc;
        } else {
            return null;
        }
    }

    // Sign in with google
    const signInWithGoogle = () => {
        if (!checkUsername()) {
            return;
        }
        const provider = new GoogleAuthProvider();
        signInWithPopup(getAuth(), provider)
        .then( async (result) => {
            console.log(result.user);
            // Check if user exists
            const uDoc = await getDoc(doc(db, 'users', result.user.uid))
            if (!uDoc.exists()) { // Make user if doesn't exist
                await setDoc(doc(db, 'users', result.user.uid), {
                    username: username.value,
                    friends: [],
                    friendRequests: [],
                    pendingRequests: [],
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
        <p><input type="text" placeholder="Username" v-model="username"/></p>
        <p><input type="text" placeholder="Email" v-model="email"/></p>
        <p><input type="password" placeholder="Password" v-model="password"/></p>
        <p v-if="errorMsg">{{ errorMsg }}</p>
        <p v-if="!registering">
            <button class="hover-up-p" @click="register">
                <p>Submit</p>
                <div class="bg"></div>
            </button>
        </p>

        <p v-if="!registering">
            <button class="hover-up-p" @click="signInWithGoogle">
                <p>Sign in with Google</p>
                <div class="bg accent"></div>
            </button>
        </p>
        <div class="bg"></div>
    </article>
</template>

<style lang="scss">
     @import '../assets/css/signIn.scss';
</style>