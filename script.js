/*=========== PRELOADER ===========*/
window.addEventListener('load', () => {
    const loader = document.querySelector('.loader-wrapper');
    setTimeout(() => {
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.style.display = 'none';
            
            // Start animations after preloader
            animateSkillBars();
            AOS.refresh();
        }, 500);
    }, 1500);
});

/*=========== INITIALIZE AOS ===========*/
AOS.init({
    duration: 1000,
    easing: 'ease-in-out',
    once: true,
    mirror: false
});

/*=========== PARTICLE BACKGROUND ===========*/
particlesJS('particles-js', {
    particles: {
        number: {
            value: 80,
            density: {
                enable: true,
                value_area: 800
            }
        },
        color: {
            value: '#4361ee'
        },
        shape: {
            type: 'circle',
            stroke: {
                width: 0,
                color: '#000000'
            },
            polygon: {
                nb_sides: 5
            }
        },
        opacity: {
            value: 0.5,
            random: false,
            anim: {
                enable: false,
                speed: 1,
                opacity_min: 0.1,
                sync: false
            }
        },
        size: {
            value: 3,
            random: true,
            anim: {
                enable: false,
                speed: 40,
                size_min: 0.1,
                sync: false
            }
        },
        line_linked: {
            enable: true,
            distance: 150,
            color: '#4361ee',
            opacity: 0.4,
            width: 1
        },
        move: {
            enable: true,
            speed: 3,
            direction: 'none',
            random: false,
            straight: false,
            out_mode: 'out',
            bounce: false,
            attract: {
                enable: false,
                rotateX: 600,
                rotateY: 1200
            }
        }
    },
    interactivity: {
        detect_on: 'canvas',
        events: {
            onhover: {
                enable: true,
                mode: 'grab'
            },
            onclick: {
                enable: true,
                mode: 'push'
            },
            resize: true
        },
        modes: {
            grab: {
                distance: 140,
                line_linked: {
                    opacity: 1
                }
            },
            bubble: {
                distance: 400,
                size: 40,
                duration: 2,
                opacity: 8,
                speed: 3
            },
            repulse: {
                distance: 200,
                duration: 0.4
            },
            push: {
                particles_nb: 4
            },
            remove: {
                particles_nb: 2
            }
        }
    },
    retina_detect: true
});

/*=========== TYPED.JS TEXT ANIMATION ===========*/
const typed = new Typed('#typing', {
    strings: ['Web Designer', 'WordPress Developer', 'Shopify Expert', 'UI/UX Designer'],
    typeSpeed: 100,
    backSpeed: 60,
    loop: true,
    backDelay: 2000
});

/*=========== DOM ELEMENTS ===========*/
const header = document.querySelector('#header');
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');
const navLinksItems = document.querySelectorAll('.nav-links ul li a');
const themeToggle = document.querySelector('.theme-toggle');
const categoryBtns = document.querySelectorAll('.category-btn');
const skillsGroups = document.querySelectorAll('.skills-group');
const filterBtns = document.querySelectorAll('.filter-btn');
const projectItems = document.querySelectorAll('.project-item');
const contactForm = document.querySelector('#contactForm');

/*=========== STICKY HEADER ===========*/
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        header.style.padding = '1.5rem 0';
        header.style.boxShadow = '0 5px 20px rgba(0, 0, 0, 0.1)';
    } else {
        header.style.padding = '2rem 0';
        header.style.boxShadow = 'none';
    }
});

/*=========== MOBILE MENU TOGGLE ===========*/
hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('active');
});

// Close mobile menu when clicking menu items
navLinksItems.forEach(item => {
    item.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navLinks.classList.remove('active');
    });
});

/*=========== DARK MODE TOGGLE ===========*/
// Check if dark mode is enabled in localStorage
if (localStorage.getItem('darkMode') === 'enabled') {
    document.body.classList.add('dark-mode');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
}

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    
    if (document.body.classList.contains('dark-mode')) {
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        localStorage.setItem('darkMode', 'enabled');
    } else {
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        localStorage.setItem('darkMode', null);
    }
});

/*=========== ACTIVE NAVIGATION ON SCROLL ===========*/
window.addEventListener('scroll', () => {
    let current = '';
    const sections = document.querySelectorAll('section');
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        
        if (pageYOffset >= (sectionTop - 200)) {
            current = section.getAttribute('id');
        }
    });
    
    navLinksItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('href') === `#${current}`) {
            item.classList.add('active');
        }
    });
});

/*=========== SKILLS TABS ===========*/
categoryBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all buttons
        categoryBtns.forEach(b => b.classList.remove('active'));
        
        // Add active class to clicked button
        btn.classList.add('active');
        
        const category = btn.getAttribute('data-category');
        
        // Hide all skill groups
        skillsGroups.forEach(group => {
            group.classList.remove('active');
        });
        
        // Show selected skill group
        document.getElementById(`${category}-skills`).classList.add('active');
        
        // Animate skill bars for visible group
        animateSkillBars();
    });
});

/*=========== ANIMATE SKILL BARS ===========*/
function animateSkillBars() {
    const activeGroup = document.querySelector('.skills-group.active');
    if (activeGroup) {
        const skillBars = activeGroup.querySelectorAll('.skill-bar span');
        skillBars.forEach(bar => {
            const width = bar.style.width;
            bar.style.width = '0';
            setTimeout(() => {
                bar.style.width = width;
            }, 200);
        });
    }
}

/*=========== PROJECTS FILTER ===========*/
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all buttons
        filterBtns.forEach(b => b.classList.remove('active'));
        
        // Add active class to clicked button
        btn.classList.add('active');
        
        const filter = btn.getAttribute('data-filter');
        
        projectItems.forEach(item => {
            if (filter === 'all') {
                item.style.display = 'block';
            } else if (item.classList.contains(filter)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    });
});

/*=========== CONTACT FORM SUBMISSION ===========*/
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Get form data
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const subject = document.getElementById('subject').value;
        const message = document.getElementById('message').value;
        
        // Validate form data
        if (!name || !email || !subject || !message) {
            showAlert('Please fill in all fields', 'error');
            return;
        }
        
        // In a real application, you would send the form data to a server
        // For demonstration, we'll just show a success message
        
        // Show success message
        showAlert('Your message has been sent successfully!', 'success');
        
        // Reset form
        contactForm.reset();
    });
}

/*=========== ALERT FUNCTION ===========*/
function showAlert(message, type) {
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert ${type}`;
    alertDiv.innerHTML = `
        <div class="alert-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="alert-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Append alert to body
    document.body.appendChild(alertDiv);
    
    // Add show class after a small delay (for animation)
    setTimeout(() => {
        alertDiv.classList.add('show');
    }, 10);
    
    // Close alert on click
    const closeBtn = alertDiv.querySelector('.alert-close');
    closeBtn.addEventListener('click', () => {
        alertDiv.classList.remove('show');
        setTimeout(() => {
            alertDiv.remove();
        }, 300);
    });
    
    // Auto close after 5 seconds
    setTimeout(() => {
        if (document.body.contains(alertDiv)) {
            alertDiv.classList.remove('show');
            setTimeout(() => {
                alertDiv.remove();
            }, 300);
        }
    }, 5000);
}

/*=========== ANIMATE ON SCROLL INITIALIZATION ===========*/
document.addEventListener('DOMContentLoaded', () => {
    // Refresh AOS
    AOS.refresh();
    
    // Add styles for alerts
    const style = document.createElement('style');
    style.textContent = `
        .alert {
            position: fixed;
            top: 2rem;
            right: 2rem;
            padding: 1.5rem 2.5rem;
            border-radius: 0.5rem;
            background-color: #fff;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
            display: flex;
            align-items: center;
            justify-content: space-between;
            z-index: 9999;
            transform: translateX(110%);
            transition: transform 0.3s ease-in-out;
            max-width: 40rem;
        }
        
        .alert.show {
            transform: translateX(0);
        }
        
        .alert.success {
            border-left: 0.4rem solid #4caf50;
        }
        
        .alert.error {
            border-left: 0.4rem solid #f44336;
        }
        
        .alert-content {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        
        .alert-content i {
            font-size: 2rem;
        }
        
        .success .alert-content i {
            color: #4caf50;
        }
        
        .error .alert-content i {
            color: #f44336;
        }
        
        .alert-content span {
            font-size: 1.4rem;
            color: #333;
        }
        
        .alert-close {
            background: none;
            border: none;
            cursor: pointer;
            font-size: 1.4rem;
            color: #999;
            transition: color 0.3s ease;
        }
        
        .alert-close:hover {
            color: #333;
        }
    `;
    document.head.appendChild(style);
});
