<script setup>
import { RouterLink } from 'vue-router'
import { ArrowLeft, BookOpen, Activity, Info } from 'lucide-vue-next'
import { SITE_SHORT_NAME, SITE_PLATFORM_TAGLINE, SITE_FULL_NAME } from '@/constants/branding'

const sources = [
  {
    title: '穴位导航',
    desc: '穴名、定位、主治及与穴位相关的配图等',
    url: 'https://www.yixue.com/',
    label: '医学百科（yixue.com）',
  },
  {
    title: '药材百科',
    desc: '药材名称、性味功效等条目及配图',
    url: 'http://www.cnzyao.com',
    label: '中医药网（cnzyao.com）',
  },
]
</script>

<template>
  <div class="min-h-screen bg-[#FDFBF7] text-stone-800 pb-24">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <RouterLink
        to="/"
        class="inline-flex items-center gap-1.5 text-sm text-sandalwood hover:text-cinnabar transition-colors mb-8"
      >
        <ArrowLeft class="w-4 h-4" />
        <span>返回首页</span>
      </RouterLink>

      <header class="mb-10">
        <div class="flex items-center gap-2 text-emerald-800/90 mb-2">
          <Info class="w-6 h-6 shrink-0" />
          <span class="text-sm font-medium tracking-wide">站点说明</span>
        </div>
        <h1 class="text-[1.75rem] sm:text-3xl font-['Ma_Shan_Zheng',cursive] text-stone-900 tracking-[0.06em] leading-tight mb-3">
          关于本站
        </h1>
        <p class="text-stone-600 text-sm sm:text-base leading-relaxed">
          {{ SITE_FULL_NAME }}（{{ SITE_SHORT_NAME }}）面向中医药文化与食疗学习，{{ SITE_PLATFORM_TAGLINE }}。以下说明涉及「药材百科」「穴位导航」等模块的数据与图片来源，以及本站所做的整理方式。
        </p>
      </header>

      <section class="mb-10 rounded-2xl border border-sandalwood/15 bg-white/80 shadow-sm p-5 sm:p-6 space-y-4">
        <h2 class="text-lg font-semibold text-stone-900 flex items-center gap-2">
          <BookOpen class="w-5 h-5 text-emerald-700 shrink-0" />
          数据与图片来源
        </h2>
        <p class="text-sm sm:text-[15px] text-stone-600 leading-relaxed">
          建设过程中，部分条目与配图曾对照以下公开网站的信息与素材，仅用于学习、整理与产品演示，不代表与上述站点存在商业合作或授权承诺。版权归原作者及原站点运营方所有。
        </p>
        <ul class="space-y-4">
          <li
            v-for="item in sources"
            :key="item.title"
            class="rounded-xl border border-stone-100 bg-stone-50/80 p-4"
          >
            <div class="font-medium text-stone-900 mb-1 flex items-center gap-2">
              <Activity v-if="item.title === '穴位导航'" class="w-4 h-4 text-emerald-600 shrink-0" />
              <BookOpen v-else class="w-4 h-4 text-emerald-600 shrink-0" />
              {{ item.title }}
            </div>
            <p class="text-sm text-stone-600 mb-2">{{ item.desc }}</p>
            <a
              :href="item.url"
              class="text-sm text-emerald-700 hover:text-emerald-900 underline underline-offset-2 break-all"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ item.label }}
            </a>
          </li>
        </ul>
        <p class="text-sm text-stone-500 leading-relaxed">
          本站<strong class="text-stone-700 font-medium">不是</strong>对上述站点的简单整站爬取或页面镜像，也<strong class="text-stone-700 font-medium">不保证</strong>与任一原文页面在字句、排版或更新时间上完全一致。
        </p>
      </section>

      <section class="mb-10 rounded-2xl border border-sandalwood/15 bg-white/80 shadow-sm p-5 sm:p-6 space-y-4">
        <h2 class="text-lg font-semibold text-stone-900">整理与清洗说明</h2>
        <p class="text-sm sm:text-[15px] text-stone-600 leading-relaxed">
          在引用与对照公开资料的基础上，我们进行了<strong class="text-stone-800">独立的整理、校验与清洗</strong>，包括但不限于：
        </p>
        <ul class="list-disc pl-5 text-sm sm:text-[15px] text-stone-600 space-y-2 leading-relaxed">
          <li>字段结构与命名归一、重复或明显错误条目的合并与修正；</li>
          <li>正文分段、标点与用语风格的统一，删减重录与低质量片段；</li>
          <li>与站内分类、标签、检索字段对齐，便于学习与浏览；</li>
          <li>配图筛选、与条目的对应关系及展示规格调整，以符合本站版式与合规要求。</li>
        </ul>
        <p class="text-sm sm:text-[15px] text-stone-600 leading-relaxed">
          因此，您在本站看到的内容是<strong class="text-stone-800">经加工后的数据集</strong>，与第三方站点原文<strong class="text-stone-800">不构成一一对应</strong>。若将本站内容用于严肃临床或用药决策，请务必咨询具备资质的医师并查阅权威文献。
        </p>
      </section>

      <section class="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-5 sm:p-6 space-y-3">
        <h2 class="text-lg font-semibold text-stone-900">免责声明</h2>
        <p class="text-sm text-stone-600 leading-relaxed">
          本站所载中医药与食疗相关内容仅供文化教育与健康知识参考，<strong class="text-stone-800">不能替代</strong>执业医师面诊与处方。请勿将本站信息自行用于诊断或治疗。因参考本站内容而产生的任何后果，本站不承担责任。
        </p>
      </section>
    </div>
  </div>
</template>
