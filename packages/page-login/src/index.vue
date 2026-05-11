<template>
  <div class="login-page">
    <div class="login-panel">
      <div class="login-copy">
        <p class="eyebrow">框架入口</p>
        <h1>登录演示工作台</h1>
        <p>
          这是一个不依赖业务接口的公共登录页，用来演示独立交付场景下的统一登录体验，也方便后续替换成客户自己的认证体系。
        </p>
      </div>

      <el-form ref="formRef" :model="formData" :rules="rules" label-position="top" class="login-form">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="formData.username" placeholder="请输入任意用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="formData.password" type="password" show-password placeholder="请输入任意密码" />
        </el-form-item>
        <el-form-item>
          <el-button class="login-btn" type="primary" :loading="loading" @click="login">进入框架演示</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const formRef = ref();
const loading = ref(false);
const formData = reactive({
  username: 'framework-admin',
  password: 'framework-demo',
});

const rules = {
  username: [{ required: true, message: '请输入用户名。', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码。', trigger: 'blur' }],
};

const persistLoginState = () => {
  const token = `framework-demo-token:${formData.username}`;
  sessionStorage.setItem('token', token);
  localStorage.setItem('token', token);
  localStorage.setItem(
    'userInfo',
    JSON.stringify({
      username: formData.username,
      displayName: '框架演示用户',
      roles: ['framework-admin'],
    }),
  );
};

const login = async () => {
  const passed = await formRef.value?.validate().catch(() => false);
  if (!passed) {
    return;
  }

  loading.value = true;
  window.setTimeout(() => {
    persistLoginState();
    loading.value = false;
    router.push('/home');
  }, 300);
};

const handleKeyPress = (event) => {
  if (event.key === 'Enter') {
    login();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyPress, false);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyPress, false);
});
</script>

<style scoped lang="scss">
.login-page {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at top left, rgba(37, 99, 235, 0.28), transparent 32%),
    linear-gradient(135deg, #0f172a, #1e293b 52%, #334155);
  padding: 24px;
  box-sizing: border-box;
}

.login-panel {
  width: min(920px, 100%);
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 28px;
  padding: 32px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.28);
}

.eyebrow {
  margin: 0 0 10px;
  color: #2563eb;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
}

h1,
p {
  margin: 0;
}

h1 {
  font-size: 36px;
  margin-bottom: 14px;
  color: #0f172a;
}

.login-copy p:last-child {
  color: #475569;
  line-height: 1.8;
}

.login-form {
  padding: 24px;
  border-radius: 18px;
  background: #f8fafc;
}

.login-btn {
  width: 100%;
  height: 44px;
}

@media (max-width: 900px) {
  .login-panel {
    grid-template-columns: 1fr;
  }
}
</style>
