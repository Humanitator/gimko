import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: "/", component: () => import("../views/Home.vue")},
  { path: "/about", component: () => import("../views/About.vue")},
  {
    path: "/tree",
    component: () => import("../views/TreeMain.vue"),
    meta: {
      requiresAuth: true,
    }
  },
  { path: "/register", component: () => import("../views/Register.vue")},
  { path: "/sign-in", component: () => import("../views/SignIn.vue")},
  {
    path: '/tree/:id', name: 'tree', component: import("../components/TreeView.vue"),
    meta: {
      requiresAuth: true,
    }
  },
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

const getCurrentUser = () => {
  return new Promise((resolve, reject) => {
    const removeListener = onAuthStateChanged(
      getAuth(),
      (user) => {
        removeListener();
        resolve(user);
      },
      reject
    ) 
  });
};

router.beforeEach( async (to, from, next) => {
  if (to.matched.some((record) => record.meta.requiresAuth)) {
    if (await getCurrentUser()) {
      next();
    } else {
      alert("you dont have access!");
      next("/");
    }
  } else {
    next();
  }
});

export default router
