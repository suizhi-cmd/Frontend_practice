* 在vscode中输入!自动填充框架
* ``<html lang="zh-CN">``中文网页改成zh-CN
* 过程中遇到了AI的问题，在一个文件里面写了``readProfile``函数，但在index.js中没有写这个函数,后来发现不是没有写，而是把代码放错地方了 
* 结合自己的综设课题，最终选择Vue语言
* 关于文件frontend/src/style.css的修改替换问题：原代码很长，替换很短，再三确认
* 一开始不懂为什么端口要一直变化。端口变化不是网站升级的目标，只是不同开发工具使用了不同入口。
* 当代码变长：用搜索功能。
* index.js增加自定义模块，但是没有在浏览器页面显示：找到原因了：你保存的函数里，旧的 return JSON.parse(text); 还在。执行到 return 时函数就结束了，后面新增的内容不会运行。
* 写编辑个人资料那一块代码迁移的时候，代码复制错文件里。第 1 段代码放 ProfileEditor.vue，第 2 段代码放 App.vue，分别替换，不能混放。
* AI会把文件名写错：json写成js
* IntroAssistant.vue 就是用来放 AI 助手的 Vue 组件，不用删。 我前后使用了 IntroAssistant.vue 和 AssistantChat.vue 两个名字，造成了混淆；它们承担的是同一个功能，保留一份即可。
* 想修改界面显示，AI老师让我生成新的vue文件，有点繁琐
* 代码生成错误：    loading="lazy"
  >
        </div>
      </article>
    </div>
  </div>
</template>