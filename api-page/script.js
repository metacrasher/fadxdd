
/* =========================================
   FADXD PROFILE DRAWER SYSTEM
========================================= */

document.addEventListener('DOMContentLoaded', () => {
    const menuButton = document.getElementById('profileMenuButton');
    const drawer = document.getElementById('profileDrawer');
    const overlay = document.getElementById('profileOverlay');
    const closeButton = document.getElementById('closeProfileDrawer');
    const drawerYear = document.getElementById('drawerYear');

    if (drawerYear) {
        drawerYear.textContent = new Date().getFullYear();
    }

    if (!menuButton || !drawer || !overlay || !closeButton) {
        console.warn('Profile drawer elements were not found.');
        return;
    }

    const openDrawer = () => {
        drawer.classList.add('open');
        overlay.classList.add('show');
        menuButton.classList.add('active');

        document.body.classList.add('drawer-open');

        menuButton.setAttribute('aria-expanded', 'true');
        drawer.setAttribute('aria-hidden', 'false');
    };

    const closeDrawer = () => {
        drawer.classList.remove('open');
        overlay.classList.remove('show');
        menuButton.classList.remove('active');

        document.body.classList.remove('drawer-open');

        menuButton.setAttribute('aria-expanded', 'false');
        drawer.setAttribute('aria-hidden', 'true');
    };

    menuButton.addEventListener('click', () => {
        if (drawer.classList.contains('open')) {
            closeDrawer();
        } else {
            openDrawer();
        }
    });

    closeButton.addEventListener('click', closeDrawer);
    overlay.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && drawer.classList.contains('open')) {
            closeDrawer();
        }
    });

    drawer.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeDrawer);
    });
});
