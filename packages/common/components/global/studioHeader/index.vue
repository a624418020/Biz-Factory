<template>
  <header class="studio-header">
    <div class="studio-header__brand">
      <div class="studio-header__badge" aria-hidden="true">
        <img v-if="imageSrc" :src="imageSrc" alt="header-art" class="studio-header__image" />
        <span v-else class="studio-header__badge-text">装</span>
      </div>
      <div class="studio-header__text">
        <p v-if="eyebrow" class="studio-header__eyebrow">{{ eyebrow }}</p>
        <h2>{{ title }}</h2>
        <p v-if="subtitle" class="studio-header__subtitle">{{ subtitle }}</p>
      </div>
    </div>

    <div class="studio-header__actions">
      <div v-if="tag" class="studio-header__tag">{{ tag }}</div>
      <div v-if="userName" class="studio-header__user">{{ userName }}</div>
      <slot />
    </div>
  </header>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    subtitle?: string;
    eyebrow?: string;
    tag?: string;
    userName?: string;
    imageSrc?: string;
  }>(),
  {
    title: '应用装配平台',
    subtitle: '',
    eyebrow: '',
    tag: '',
    userName: '',
    imageSrc: '',
  },
);
</script>

<style scoped lang="scss">
.studio-header {
  min-height: 48px;
  height: 48px;
  padding: 8px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: transparent;
}

.studio-header__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.studio-header__badge {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.studio-header__image {
  width: 18px;
  height: 18px;
  object-fit: contain;
}

.studio-header__badge-text {
  font-size: 11px;
  font-weight: 700;
  color: #1d4ed8;
  line-height: 1;
}

.studio-header__text {
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
}

.studio-header__eyebrow,
.studio-header__subtitle,
.studio-header__brand h2 {
  margin: 0;
}

.studio-header__eyebrow {
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #2563eb;
}

.studio-header__brand h2 {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
}

.studio-header__subtitle {
  color: #64748b;
  font-size: 11px;
  line-height: 1.3;
}

.studio-header__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.studio-header__tag {
  height: 28px;
  padding: 0 10px;
  border-radius: 14px;
  background: #3b82f6;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
}

.studio-header__user {
  padding-left: 10px;
  border-left: 1px solid rgba(148, 163, 184, 0.4);
  color: #334155;
  font-size: 12px;
}

@media (max-width: 960px) {
  .studio-header {
    height: auto;
    min-height: 48px;
    align-items: flex-start;
    flex-direction: column;
  }

  .studio-header__text {
    gap: 4px 8px;
  }
}
</style>
