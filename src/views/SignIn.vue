<script setup>
    import { ref } from 'vue';
    import {
        getAuth,
        signInWithEmailAndPassword,
        GoogleAuthProvider,
        signInWithPopup,
    } from "firebase/auth";
    import { useRouter } from 'vue-router';

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
        .then((result) => {
            console.log(result.user);
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
        <p><button @click="register">Submit</button></p>
    
        <p><button @click="signInWithGoogle">Sign in with Google</button></p>
    </article>
</template>

<style lang="scss">
    @import '../assets/css/signIn.scss';
</style>