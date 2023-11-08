<script setup>
    import { ref, onMounted } from 'vue';
    import {
        getAuth,
        signInWithEmailAndPassword,
        GoogleAuthProvider,
        signInWithPopup,
    } from "firebase/auth";
    import { useRouter } from 'vue-router';
import { doc } from 'firebase/firestore';

    const email = ref("");
    const password = ref("");
    
    const errorMsg = ref();

    const router = useRouter(); // Get a refrence to router

    const register = () => {
        // Need .value because ref()
        const auth = getAuth();
        signInWithEmailAndPassword(auth, email.value, password.value)
        .then((data) => {
            console.log("Successfully signed!");
            console.log(auth.currentUser)
            router.push('/');
        })
        .catch((error) => {
            console.log(error.code);
            switch (error.code) {
                case "auth/invalidEmail":
                    errorMsg.value = "invalid Email";
                    break;
                case "auth/user-not-found":
                    errorMsg.value = "No account with that email was found";
                    break
                case "auth/wrong-password":
                    errorMsg.value = "Incorrect password";
                    break;
                default:
                    errorMsg.value = "Email or password was incorrect";
                    break;
            }
        });
    };

    const signInWithGoogle = () => {
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
        document.title = "gimko | Sign In";
    });
</script>

<template>
    <h1>Sign In</h1>
    <article>
        <p><input type="text" placeholder="Email" v-model="email"/></p>
        <p><input type="password" placeholder="Password" v-model="password"/></p>
        <p v-if="errorMsg">{{ errorMsg }}</p>
        <p>
            <button class="hover-up-p"  @click="register">
                <p>Submit</p>
                <div class="bg"></div>
            </button>
        </p>
    
        <p>
            <button class="hover-up-p" @click="signInWithGoogle">
                <p> Sign in with Google</p>
                <div class="bg accent"></div>
            </button>
        </p>
        
        <div class="bg"></div>
    </article>
</template>

<style lang="scss">
    @import '../assets/css/signIn.scss';
    @import '../assets/css/base.scss';
    @import '../assets/css/colors.scss';
</style>