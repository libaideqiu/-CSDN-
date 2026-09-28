const toggle = document.getElementById('toggle');
const status = document.getElementById('status');

function render(enabled) {
  toggle.checked = enabled;
  status.textContent = enabled ? '✓ 运行中，正在拦截知乎/CSDN 登录弹窗' : '已暂停，登录弹窗恢复显示';
  status.classList.toggle('on', enabled);
}

chrome.storage.sync.get({ enabled: true }, (cfg) => render(cfg.enabled !== false));

toggle.addEventListener('change', () => {
  chrome.storage.sync.set({ enabled: toggle.checked });
  render(toggle.checked);
});
