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
    import { defaultUser } from '@/firebase/defaultStructs';

    const username = ref("");
    const email = ref("");
    const password = ref("");

    const router = useRouter(); // Get a refrence to router
    const errorMsg = ref();

    // Check if username is in use
    const checkUsername = async () => {
        // Check if username is valid
        const regexPattern = /^[a-zA-Z0-9]+$/; // Allows only letters and numbers

        if (username.value.length < 3 || username.value.length >= 16) {
            errorMsg.value = "Lietotājvārdam jābūt no 3 līdz 16 burtu garam!";
            registering.value = false;
            return false;
        } else if (!regexPattern.test(username.value)) {
            errorMsg.value = "Lietotājvārdam jāsastāv tikai no burtiem un cipariem!";
            registering.value = false;
            return false;
        }

        // Check if username exists
        const existingUser = await getDoc(doc(db, "users", username.value));
        if (existingUser.exists()) {
            errorMsg.value = "Lietotājvārds jau ir aizņemts!"
            registering.value = false;
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
                // console.log("Id" + data.user.uid);
                // Add user to database
                await setDoc(doc(db, 'users', data.user.uid), structuredClone(defaultUser));

                // Move user to home
                router.push('/');
            })
            .catch((error) => {
                console.log(error.code);
                switch (error.code) {
                    case "auth/invalid-email":
                        errorMsg.value = "Nederīgs ē-pasts!";
                        break;
                    case "auth/user-not-found":
                        errorMsg.value = "Netika atrasts konts ar tādu ēpastu!";
                        break
                    case "auth/wrong-password":
                        errorMsg.value = "Nepareiza parole!";
                        break;
                    case "auth/missing-password":
                        errorMsg.value = "Nav paroles!";
                        break
                    case "auth/email-already-in-use":
                        errorMsg.value = "Ēpasts jau tiek lietots!";
                        break;
                    default:
                        errorMsg.value = "Kaut kas nogāja greizi. Mēģiniet nomainīt ē-pastu vai paroli.";
                        break;
                }
                registering.value = false;
            });
        });
    };

    // Sign in with google
    const signInWithGoogle = async () => {
        registering.value = true;

        if (await checkUsername()) {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(getAuth(), provider);
            // console.log(result.user);
            // Check if user exists
            const uDoc = await getDoc(doc(db, 'users', result.user.uid));
            if (!uDoc.exists()) { // Make user if doesn't exist
                let user = structuredClone(defaultUser);
                user.username = username.value;
                await setDoc(doc(db, 'users', result.user.uid), user);
            };

            router.push("/");
        }
    };

    onMounted(() => {
        document.title = "gimko | Reģistrēties";
    });
</script>

<template>
    <h1>Izveidot Kontu</h1>

    <article>
        <p><input type="text" placeholder="Lietotājvārds" v-model="username"/></p>
        <p><input type="text" placeholder="Ē-pasts" v-model="email"/></p>
        <p><input type="password" placeholder="Parole" v-model="password"/></p>
        <p v-if="errorMsg">{{ errorMsg }}</p>
        <p v-if="!registering">
            <button class="hover-up-p" @click="register()">
                <p>Iesniegt</p>
                <div class="bg"></div>
            </button>
        </p>

        <p v-if="!registering">
            <button class="hover-up-p" @click="signInWithGoogle()">
                <p>Pievienoties ar Google</p>
                <div class="bg accent"></div>
            </button>
        </p>
        <div class="bg"></div>
    </article>
</template>

<style lang="scss">
     @import '../assets/css/signIn.scss';
</style>