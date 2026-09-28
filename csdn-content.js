/**
 * CSDN 免登录 - 内容脚本
 * 功能：
 *  1. 自动移除登录弹窗与遮罩（passport-login-container 等）
 *  2. 解除弹窗造成的页面滚动锁定
 *  3. 自动展开被"阅读全文"截断的文章正文
 *  4. 移除"登录后您可以享受以下权益"提示浮窗、"一键收藏"自动弹出提示
 */
(() => {
  'use strict';

  // CSDN 登录弹窗 / 遮罩 / 提示浮窗选择器（新旧版本兼容）
  const LOGIN_SELECTORS = [
    '.passport-login-container',       // 新版全屏登录弹窗
    '.passport-login-mask',            // 新版遮罩
    '.passport-login-tip-container',   // "登录后您可以享受以下权益"提示浮窗
    '.login-mask',                     // 旧版遮罩
    '.login-full',                     // 旧版全屏登录
    '#passportbox',                    // 旧版浮动登录框
    '.login-box'                       // 旧版登录框
  ];

  let enabled = true;

  // 读取开关状态（与知乎脚本共用同一个开关）
  try {
    chrome.storage.sync.get({ enabled: true }, (cfg) => {
      enabled = cfg.enabled !== false;
      clean();
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && changes.enabled) {
        enabled = changes.enabled.newValue !== false;
        if (enabled) clean();
      }
    });
  } catch (e) {
    /* storage 不可用时保持默认开启 */
  }

  // 恢复页面滚动
  function restoreScroll() {
    const { body, documentElement: html } = document;
    if (body) body.style.removeProperty('overflow');
    html.style.removeProperty('overflow');
  }

  // 展开被"阅读全文"折叠的正文
  function expandArticle() {
    // 移除底部渐变遮挡层
    document.querySelectorAll('.hide-article-box').forEach((el) => el.remove());
    // 触发官方展开按钮（若存在）
    const btn = document.getElementById('btn-readmore');
    if (btn) btn.click();
    // 兜底：直接清除正文截断样式
    document.querySelectorAll('.article_content, #content_views, article').forEach((el) => {
      el.style.removeProperty('max-height');
      el.style.setProperty('max-height', 'none', 'important');
      el.style.setProperty('overflow', 'visible', 'important');
    });
  }

  function clean() {
    if (!enabled || !document.body) return;

    document.querySelectorAll(LOGIN_SELECTORS.join(',')).forEach((el) => {
      if (!enabled) return;
      // 文本兜底校验，避免误删同名业务元素
      const text = (el.textContent || '').slice(0, 400);
      if (el.id === 'passportbox' || /登录|注册|扫码|手机号/.test(text)) {
        el.remove();
      }
    });

    restoreScroll();
    expandArticle();
  }

  // ---- 监听 DOM 变化（CSDN 动态注入弹窗），200ms 防抖 ----
  let timer = null;
  const observer = new MutationObserver(() => {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      clean();
    }, 200);
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', clean);
})();
