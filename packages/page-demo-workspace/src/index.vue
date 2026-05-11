<template>
  <div class="simple-story-page">
    <section class="hero-card">
      <p class="eyebrow">Architecture Story</p>
      <h1>拿着菜单清单，去页面仓库，马上装出成品</h1>
      <p class="summary">
        清单上写哪几个页面，开发时就只看到哪几个页面。
      </p>
    </section>

    <section class="flow-card">
      <div class="flow-step" :class="{ active: activeStep === 0 }">
        <div class="step-badge">1</div>
        <h2>菜单清单</h2>
        <p>清单可以变，选中的页面也跟着变。</p>
        <div class="note-sheet-grid">
          <div
            v-for="sheet in planVariants"
            :key="sheet.title"
            class="note-sheet"
            :class="{ active: activeSheetTitle === sheet.title }"
          >
            <div class="sheet-title">{{ sheet.title }}</div>
            <div v-for="item in sheet.items" :key="item.name" class="sheet-row">
              <span class="check-mark">✓</span>
              <span>{{ item.label }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="flow-arrow" :class="{ active: activeStep === 0 }">→</div>

      <div class="flow-step warehouse-step" :class="{ active: activeStep === 1 }">
        <div class="step-badge">2</div>
        <h2>页面仓库</h2>
        <p>仓库里很多页面，但只拿被点名的。</p>
        <div class="box-grid">
          <div
            v-for="page in warehousePages"
            :key="page.name"
            class="page-box"
            :class="{ selected: page.selected, dimmed: !page.selected }"
          >
            {{ page.label }}
          </div>
        </div>
      </div>

      <div class="flow-arrow" :class="{ active: activeStep === 1 }">→</div>

      <div class="flow-step product-step" :class="{ active: activeStep === 2 }">
        <div class="step-badge">3</div>
        <h2>成品应用</h2>
        <p>很快装出一个只包含当前方案页面的应用。</p>
        <div class="product-card">
          <div class="product-screen">
            <span>成品</span>
            <small>{{ currentPlan.productText }}</small>
          </div>
        </div>
      </div>
    </section>

    <section class="bottom-line">
      <strong>一句话：</strong>
      <span>选几个页面，就开发几个页面，就交付几个页面。</span>
    </section>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const STEP_INTERVAL_MS = 2200;

const planVariants = [
  {
    title: '方案 A',
    items: [
      { name: 'page:app-management', label: '业务应用' },
      { name: 'page:page-management', label: '页面能力库' },
      { name: 'page:menu-management', label: '导航方案' },
    ],
  },
  {
    title: '方案 B',
    items: [
      { name: 'page:dashboard', label: '演示看板' },
      { name: 'page:workspace', label: '演示工作区' },
    ],
  },
];

const warehouseCatalog = [
  { name: 'page:login', label: '登录页' },
  { name: 'page:dashboard', label: '演示看板' },
  { name: 'page:workspace', label: '演示工作区' },
  { name: 'page:app-management', label: '业务应用' },
  { name: 'page:page-management', label: '页面能力库' },
  { name: 'page:menu-management', label: '导航方案' },
  { name: 'page:report-center', label: '报表中心' },
];

const activeStep = ref(0);
const activePlanIndex = ref(0);
const activeSheetTitle = computed(() => currentPlan.value.title);

const currentPlan = computed(() => {
  const plan = planVariants[activePlanIndex.value] || planVariants[0];
  return {
    ...plan,
    productText: `只包含${plan.title}选中的页面`,
  };
});

const warehousePages = computed(() => {
  const selectedNames = new Set(currentPlan.value.items.map((item) => item.name));
  return warehouseCatalog.map((page) => ({
    ...page,
    selected: selectedNames.has(page.name),
  }));
});

let stepTimer = null;

function startStepLoop() {
  stepTimer = window.setInterval(() => {
    const nextStep = (activeStep.value + 1) % 3;
    if (nextStep === 0) {
      activePlanIndex.value = (activePlanIndex.value + 1) % planVariants.length;
    }
    activeStep.value = nextStep;
  }, STEP_INTERVAL_MS);
}

function stopStepLoop() {
  if (stepTimer) {
    window.clearInterval(stepTimer);
    stepTimer = null;
  }
}

onMounted(() => {
  startStepLoop();
});

onBeforeUnmount(() => {
  stopStepLoop();
});
</script>

<style scoped lang="scss">
.simple-story-page {
  --ink: #3b2f2f;
  --paper: #fffdf6;
  --accent: #ff8f6b;
  --line: rgba(75, 58, 52, 0.12);
  --shadow: 0 14px 32px rgba(139, 95, 60, 0.12);

  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 20px 24px;
  height: 100%;
  background:
    radial-gradient(circle at top left, rgba(255, 241, 199, 0.7), transparent 35%),
    linear-gradient(180deg, #fff8ea 0%, #fffdf8 100%);
}

.hero-card,
.flow-card,
.bottom-line {
  border-radius: 28px;
  border: 3px solid var(--line);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: var(--shadow);
}

.hero-card {
  padding: 24px 28px;
  text-align: center;
}

.eyebrow {
  margin: 0 0 8px;
  color: #ff7b54;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

h1,
h2,
p {
  margin: 0;
  color: var(--ink);
}

h1 {
  font-size: 32px;
  line-height: 1.22;

  margin: 0 auto;
}

.summary {
  margin: 10px auto 0;
  color: #6b5850;
  font-size: 16px;
  max-width: 28em;
}

.flow-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 48px minmax(0, 1.2fr) 48px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  padding: 20px;
}

.flow-step {
  min-height: 90%;
  padding: 18px 18px;
  border-radius: 24px;
  background: var(--paper);
  border: 2px solid var(--line);
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease, background 0.25s ease;
}

.flow-step.active {
  transform: translateY(-6px);
  border-color: rgba(255, 143, 107, 0.34);
  box-shadow: 0 18px 28px rgba(255, 143, 107, 0.14);
}

.warehouse-step {
  background: #fffaf0;
}

.product-step {
  background: #fff7e5;
}

.step-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-weight: 900;
  margin-bottom: 14px;
  transition: transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;
}

.flow-step.active .step-badge {
  transform: scale(1.08);
  box-shadow: 0 10px 20px rgba(255, 143, 107, 0.3);
}

.flow-step h2 {
  font-size: 20px;
}

.flow-step p {
  margin-top: 6px;
  color: #7a665d;
  line-height: 1.6;
  font-size: 14px;
}

.flow-arrow {
  text-align: center;
  font-size: 34px;
  font-weight: 900;
  color: rgba(255, 143, 107, 0.45);
  transition: color 0.25s ease, transform 0.25s ease;
}

.flow-arrow.active {
  color: #ff8f6b;
  transform: scale(1.12);
}

.note-sheet-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.note-sheet {
  padding: 12px;
  border-radius: 18px;
  background: #fff9ef;
  border: 2px dashed rgba(75, 58, 52, 0.12);
  transition: border-color 0.25s ease, background 0.25s ease, transform 0.25s ease;
}

.note-sheet.active {
  background: #fff3cb;
  border-color: rgba(255, 143, 107, 0.3);
  transform: translateY(-2px);
}

.sheet-title {
  margin-bottom: 6px;
  color: #7a5e50;
  font-size: 12px;
  font-weight: 800;
}

.sheet-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  color: var(--ink);
  font-weight: 700;
  font-size: 14px;
}

.check-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #dff8eb;
  color: #23976f;
}

.box-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.page-box {
  padding: 12px 10px;
  border-radius: 18px;
  text-align: center;
  font-weight: 700;
  border: 2px solid var(--line);
  background: #fffef9;
  color: #7e6a61;
  font-size: 14px;
}

.page-box.selected {
  background: #fff1bf;
  border-color: rgba(255, 143, 107, 0.45);
  color: var(--ink);
}

.page-box.dimmed {
  opacity: 0.45;
}

.product-card {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 150px;
  margin-top: 14px;
  border-radius: 22px;
  background: linear-gradient(180deg, #fff0c7 0%, #fffaf0 100%);
  border: 2px solid rgba(255, 183, 76, 0.36);
}

.product-screen {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.product-screen span {
  font-size: 24px;
  font-weight: 900;
  color: #7a563b;
}

.product-screen small {
  color: #8c7567;
  font-size: 14px;
}

.bottom-line {
  padding: 16px 20px;
  text-align: center;
  font-size: 18px;
  color: #6d564c;
}

.bottom-line strong {
  color: var(--ink);
}

@media (max-width: 1080px) {
  .flow-card {
    grid-template-columns: 1fr;
  }

  .flow-arrow {
    transform: rotate(90deg);
  }
}

@media (max-width: 720px) {
  .simple-story-page {
    padding: 16px;
  }

  .hero-card,
  .flow-card,
  .bottom-line {
    border-radius: 22px;
    padding: 18px;
  }

  h1 {
    font-size: 28px;
    max-width: none;
  }

  .summary,
  .bottom-line {
    font-size: 16px;
  }

  .note-sheet-grid,
  .box-grid {
    grid-template-columns: 1fr;
  }
}
</style>
