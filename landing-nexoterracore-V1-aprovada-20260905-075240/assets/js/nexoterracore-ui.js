document.addEventListener('DOMContentLoaded', function () {
    const mobileToggle = document.getElementById('ntcMobileToggle');
    const drawer = document.getElementById('ntcDrawer');

    if (mobileToggle && drawer) {
        mobileToggle.addEventListener('click', function () {
            drawer.classList.toggle('open');
            mobileToggle.classList.toggle('active');
        });

        drawer.querySelectorAll('.ntc-drawer-link').forEach(function (link) {
            link.addEventListener('click', function () {
                drawer.classList.remove('open');
                mobileToggle.classList.remove('active');
            });
        });
    }

    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');

            if (!targetId || targetId === '#') return;

            const target = document.querySelector(targetId);

            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    const sections = document.querySelectorAll('section[id], main[id]');
    const navLinks = document.querySelectorAll('.ntc-nav-link');

    if ('IntersectionObserver' in window && sections.length) {
        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;

                const id = entry.target.getAttribute('id');

                navLinks.forEach(function (link) {
                    link.classList.toggle(
                        'active',
                        link.getAttribute('href') === '#' + id
                    );
                });
            });
        }, {
            root: null,
            rootMargin: '-20% 0px -70% 0px',
            threshold: 0
        });

        sections.forEach(function (section) {
            observer.observe(section);
        });
    }
});
