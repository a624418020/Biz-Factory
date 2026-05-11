<template>
  <div class="demo-page">
    <section class="hero-card">
      <div>
        <p class="eyebrow">框架演示</p>
        <h1>演示看板</h1>
        <p class="summary">
          这是一个不带业务接口的纯演示页面，用来展示轻量化交付场景下，如何只保留被选中的页面、应用壳和登录能力。
        </p>
      </div>
      <div class="hero-metrics">
        <div class="metric">
          <span class="metric-value">3</span>
          <span class="metric-label">核心模块</span>
        </div>
        <div class="metric">
          <span class="metric-value">2</span>
          <span class="metric-label">演示页面</span>
        </div>
        <div class="metric">
          <span class="metric-value">1</span>
          <span class="metric-label">交付模式</span>
        </div>
      </div>
    </section>

    <section class="grid">
      <article class="panel">
        <h2>这套能力的价值</h2>
        <ul>
          <li>只交付被选中的页面和能力，不再把整个大工程一起带给客户。</li>
          <li>演示基线不依赖业务接口，便于快速搭建样板和分享框架能力。</li>
          <li>微应用形态和独立应用形态共用同一套装配模型。</li>
        </ul>
      </article>
      <article class="panel">
        <h2>框架语言</h2>
        <ul>
          <li>页面能力库：可复用的页面资产和能力单元</li>
          <li>导航方案：负责菜单组织和应用图纸装配</li>
          <li>业务应用：最终面向客户交付的成品单元</li>
        </ul>
      </article>
    </section>
  </div>
</template>

<style scoped lang="scss">
.demo-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
}

.hero-card,
.panel {
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
}

.hero-card {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 28px;
}

.eyebrow {
  margin: 0 0 8px;
  color: #2563eb;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  font-size: 32px;
  margin-bottom: 12px;
}

.summary {
  max-width: 640px;
  color: #475569;
  line-height: 1.7;
}

.hero-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  min-width: 320px;
}

.metric {
  display: flex;
  flex-direction: column;
  justify-content: center;
  border-radius: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #eff6ff, #f8fafc);
}

.metric-value {
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
}

.metric-label {
  color: #64748b;
  font-size: 13px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.panel {
  padding: 24px;
}

ul {
  margin: 16px 0 0;
  padding-left: 18px;
  color: #475569;
  line-height: 1.8;
}

@media (max-width: 960px) {
  .hero-card,
  .grid {
    grid-template-columns: 1fr;
    display: grid;
  }

  .hero-metrics {
    min-width: 0;
  }
}
</style>
