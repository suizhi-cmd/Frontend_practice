<script setup lang="ts">
import { onMounted, ref } from "vue";

interface ProfileSection {
  title: string;
  content: string;
  type?: "intro" | "project";
}

// 定义个人资料的数据结构
interface Profile {
  school: string;
  college: string;
  major: string;
  interests: string;
  learning: string;
  currentProject: string;
  pastProjects: string;
  sections: ProfileSection[];
}

const profile = ref<Profile | null>(null);
const loading = ref(true);
const error = ref("");

// 给每个字段配上中文名称
const fields: { key: keyof Profile; label: string }[] = [
  { key: "school", label: "学校" },
  { key: "college", label: "学院" },
  { key: "major", label: "专业" },
  { key: "interests", label: "兴趣" },
  { key: "learning", label: "正在学习" },
  { key: "currentProject", label: "正在进行的项目" },
  { key: "pastProjects", label: "做过的项目" },
];

// 组件出现在页面上时，读取后端资料
onMounted(async () => {
  try {
    const response = await fetch("/api/profile");

    if (!response.ok) {
      throw new Error("读取资料失败，请确认后端正在运行。");
    }

    const data: Profile = await response.json();
    profile.value = data;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "暂时无法读取资料。";
  } finally {
    loading.value = false;
  }
});

// 将逗号、顿号或换行分隔的内容转为列表
function splitItems(text: string) {
  return text
    .split(/[，,、；;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}
</script>

<template>
  <div class="profile-content">
    <p v-if="loading" role="status">正在加载个人资料…</p>
    <p v-else-if="error" class="error" role="alert">{{ error }}</p>

    <template v-else-if="profile">
      <div class="overview-grid">
        <article class="info-card education">
          <header class="card-heading">
            <span class="card-icon" aria-hidden="true">⌂</span>
            <h3>教育背景</h3>
          </header>

          <strong>{{ profile.school || "暂未填写学校" }}</strong>
          <p>{{ profile.college }}</p>
          <p>{{ profile.major }}</p>

          <img
            class="card-art"
            src="/illustrations/education.png"
            alt=""
            aria-hidden="true"
          />
        </article>

        <article class="info-card exploration">
          <header class="card-heading">
            <span class="card-icon code-icon" aria-hidden="true"
              >&lt;/&gt;</span
            >
            <h3>最近在探索</h3>
          </header>

          <ul v-if="splitItems(profile.learning).length">
            <li
              v-for="(item, index) in splitItems(profile.learning).slice(0, 3)"
              :key="index"
            >
              {{ item }}
            </li>
          </ul>
          <p v-else>持续探索中。</p>

          <img
            class="card-art"
            src="/illustrations/exploration.png"
            alt=""
            aria-hidden="true"
          />
        </article>

        <article class="info-card interests">
          <header class="card-heading">
            <span class="card-icon" aria-hidden="true">♡</span>
            <h3>生活关键词</h3>
          </header>

          <div v-if="profile.interests.trim()" class="interest-list">
            <span
              v-for="(item, index) in splitItems(profile.interests).slice(0, 4)"
              :key="index"
            >
              {{ item }}
            </span>
          </div>
          <p v-else>等待记录更多生活。</p>

          <img
            class="card-art"
            src="/illustrations/interests.png"
            alt=""
            aria-hidden="true"
          />
        </article>
      </div>

      <!-- 完整资料仍可查看，首页不重复铺开 -->
      <details class="more-details">
        <summary>更多关于我</summary>

        <dl class="profile-details">
          <div v-for="field in fields" :key="field.key">
            <dt>{{ field.label }}</dt>
            <dd>{{ profile[field.key] || "暂未填写" }}</dd>
          </div>
        </dl>
      </details>

      <!-- 保留普通介绍区块，项目经历由项目组件展示 -->
      <div class="intro-sections">
        <article
          v-for="(section, index) in profile.sections.filter(
            (item) => item.type !== 'project',
          )"
          :key="index"
          class="intro-section"
        >
          <h3>{{ section.title }}</h3>
          <p>{{ section.content || "内容整理中。" }}</p>
        </article>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* 三张主要信息卡片 */
.overview-grid {
  display: grid;
  grid-template-columns: 1.15fr 1fr 1fr;
  gap: 18px;
}
.info-card {
  position: relative;
  isolation: isolate;
  min-width: 0;
  min-height: 360px;
  overflow: hidden;
  padding: 26px 26px 170px;
  border: 1px solid #ffffff90;
  border-radius: 20px;
}
.education {
  background: linear-gradient(135deg, #edf3e3, #dce9cd);
}
.exploration {
  background: linear-gradient(135deg, #e9f3ff, #d3e6f9);
}
.interests {
  background: linear-gradient(135deg, #fff0df, #ffe2bd);
}
.card-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}
.card-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #ffffff70;
  font-size: 28px;
}
.code-icon {
  font-size: 20px;
  font-weight: 700;
}
h3 {
  margin: 0;
  font-size: 19px;
}
strong {
  display: block;
  margin-bottom: 10px;
  font-size: 24px;
  line-height: 1.5;
}
.info-card p {
  margin: 5px 0;
  line-height: 1.8;
  overflow-wrap: anywhere;
}
ul {
  margin: 0;
  padding: 0;
  list-style: none;
}
li {
  margin-top: 8px;
  font-size: 19px;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.interest-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.interest-list span {
  padding: 6px 12px;
  border: 1px solid #bd794622;
  border-radius: 10px;
  background: #ffffff70;
  font-size: 17px;
}
.card-art {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 175px;
  object-fit: contain;
  object-position: right bottom;
  pointer-events: none;
}
/* 展开资料 */
.more-details {
  margin-top: 20px;
  padding: 16px 20px;
  border: 1px solid #dfe6dc;
  border-radius: 14px;
  background: #fff;
}
summary {
  color: #345b46;
  font-weight: 600;
  cursor: pointer;
}
summary:focus-visible {
  outline: 3px solid #91b897;
  outline-offset: 4px;
}
.profile-details {
  margin: 20px 0 0;
}
.profile-details > div {
  display: grid;
  grid-template-columns: 130px minmax(0, 1fr);
  gap: 16px;
  padding: 12px 0;
  border-top: 1px solid #203d3512;
}
dt {
  color: #6c7d73;
}
dd {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
/* 普通介绍区块 */
.intro-sections {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}
.intro-section {
  min-width: 0;
  margin-top: 20px;
  padding: 20px 22px;
  border: 1px solid #dfe6dc;
  border-radius: 16px;
  background: #fff;
}

.intro-section h3 {
  color: #36543d;
  font-size: 18px;
  line-height: 1.5;
}
.intro-section p {
  margin: 10px 0 0;
  color: #64715f;
  font-size: 15px;
  line-height: 1.9;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.error {
  color: #a63e35;
}
/* 平板与手机 */
@media (max-width: 900px) {
  .overview-grid {
    grid-template-columns: 1fr 1fr;
  }
  .education {
    grid-column: 1 / -1;
  }
}
@media (max-width: 600px) {
  .overview-grid,
  .intro-sections {
    grid-template-columns: 1fr;
  }
  .info-card {
    min-height: 330px;
    padding: 22px 22px 155px;
  }
  .card-art {
    height: 160px;
  }
  .profile-details > div {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
</style>
