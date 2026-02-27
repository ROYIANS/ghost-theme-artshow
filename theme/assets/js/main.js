// 小梦岛主题 JS — 最小化，只做必要交互

// Gallery filter tabs
document.querySelectorAll('.gg-f').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.gg-f').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
  });
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
  });
});
