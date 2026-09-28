/**
 * 知乎免登录 - 内容脚本
 * 功能：
 *  1. /signin?next=xxx 登录重定向页自动跳回原页面
 *  2. 自动关闭登录弹窗（Modal-wrapper / signFlowModal）
 *  3. 解除弹窗造成的 body 滚动锁定
 *  4. 移除专栏页"登录即可查看"推广卡片
 */
(() => {
  'use strict';

  // 标志"这是登录弹窗"的特征选择器
  const LOGIN_MARKS = ['.signFlowModal', '.Login-flow', '[class*="signFlow"]'];
  // 登录弹窗常见文案（兜底判断，避免误伤评论等其他 Modal）
  const LOGIN_TEXT = /扫码登录|登录知乎|注册知乎|短信登录|社交账号登录/;

  let enabled = true;

  // 读取开关状态
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

  // ---- 1. 登录重定向页：直接跳回 next 指向的原页面 ----
  if (/^\/signin/.test(location.pathname)) {
    const next = new URLSearchParams(location.search).get('next');
    if (next && next.startsWith('/') && !next.startsWith('//')) {
      location.replace(next);
      return;
    }
  }

  // 判断一个 Modal 容器是否为登录弹窗
  function isLoginModal(el) {
    if (!el || el.nodeType !== 1) return false;
    if (LOGIN_MARKS.some((sel) => el.querySelector(sel))) return true;
    const text = (el.textContent || '').slice(0, 400);
    return LOGIN_TEXT.test(text);
  }

  // 恢复页面滚动
  function restoreScroll() {
    const { body, documentElement: html } = document;
    if (body) {
      body.style.removeProperty('overflow');
      body.style.removeProperty('position');
      body.classList.remove('no-scroll');
    }
    html.style.removeProperty('overflow');
  }

  // 移除专栏页"登录即可查看 超5亿 专业优质内容"推广卡片
  // 卡片类名是构建哈希（如 css-woosw9），随时可能变化，因此用文案定位
  function removeLoginPromoCard() {
    const node = document.evaluate(
      '//*[contains(text(), "登录即可查看") or contains(text(), "专业优质内容")]',
      document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
    ).singleNodeValue;
    if (!node) return;
    let target = node;
    // 从文案节点向上回溯到整个卡片容器（父容器文本量仍很小则继续上溯）
    while (
      target.parentElement &&
      target.parentElement !== document.body &&
      (target.parentElement.textContent || '').length < 200
    ) {
      target = target.parentElement;
    }
    target.remove();
  }

  function clean() {
    if (!enabled || !document.body) return;

    // 关闭登录弹窗：优先模拟点击关闭按钮（让 React 状态正常复位），失败则直接移除
    document.querySelectorAll('.Modal-wrapper').forEach((wrapper) => {
      if (!enabled || !isLoginModal(wrapper)) return;
      const closeBtn = wrapper.querySelector('.Modal-closeButton');
      if (closeBtn) {
        closeBtn.click();
      }
      wrapper.remove();
    });

    // 移除登录弹窗遗留的遮罩层
    document.querySelectorAll('.Modal-backdrop').forEach((backdrop) => {
      const parent = backdrop.parentElement;
      if (!parent || parent.classList.contains('Modal-wrapper') || parent.querySelector('.Modal-wrapper')) {
        backdrop.remove();
      }
    });

    // 移除专栏页"登录即可查看"推广卡片
    removeLoginPromoCard();

    restoreScroll();
  }

  // ---- 监听 DOM 变化（知乎通过 React 动态注入弹窗），200ms 防抖 ----
  let timer = null;
  const observer = new MutationObserver(() => {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      clean();
    }, 200);
  });

  if (document.documentElement) {
    observer.observe(document.documentElement, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.documentElement, { childList: true, subtree: true });
      clean();
    });
  }

  document.addEventListener('DOMContentLoaded', clean);
})();
