# Dwaipyan Mandal - Professional Portfolio

A modern, animated, and professional portfolio website showcasing my skills and experience as a Web Designer & Developer specializing in WordPress and Shopify.

![Portfolio Preview](profile.jpg)

## 🌟 Features

- **Motion Graphics & Particles Background** - Dynamic animated background that responds to user interaction
- **Preloader Animation** - Smooth loading experience with animated preloader
- **Dark/Light Mode Toggle** - User preference saved in local storage
- **Responsive Design** - Optimized for all devices (mobile, tablet, desktop)
- **Interactive UI Elements** - Animated buttons, cards, and section transitions
- **Skills Categorization** - Organized display of technical skills with animated progress bars
- **Project Filtering** - Filter projects by category (WordPress, Shopify, Other)
- **Animated Timeline** - Visual representation of work experience and education
- **Typewriter Effect** - Dynamic text animation on the homepage
- **Contact Form** - Fully functional contact form with validation
- **AOS Animations** - Smooth scroll animations throughout the site
- **SEO Optimized** - Meta tags and semantic HTML for better search engine visibility

## 🚀 Technologies Used

- HTML5
- CSS3 (with custom animations and transitions)
- JavaScript (ES6+)
- [Particles.js](https://vincentgarreau.com/particles.js/) - For animated background
- [Typed.js](https://mattboldt.com/demos/typed-js/) - For typewriter effect
- [AOS](https://michalsnik.github.io/aos/) - Animate On Scroll library
- [Font Awesome](https://fontawesome.com/) - For icons
- [Google Fonts](https://fonts.google.com/) - Poppins font family

## 📋 Setup & Deployment

### Option 1: Quick Deploy with GitHub Pages

1. **Fork this repository**
   - Click the "Fork" button in the top-right corner of this repository

2. **Rename your repository**
   - Go to Settings > rename the repository to `yourusername.github.io`

3. **Customize the content**
   - Update the information in `index.html` to reflect your personal details
   - Replace images in the `assets/img/` folder with your own
   - Adjust skills, projects, and experiences in the HTML file

4. **GitHub Pages will automatically deploy your site**
   - Your portfolio will be available at `https://yourusername.github.io/`

### Option 2: Manual Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/portfolio.git
   cd portfolio
   ```

2. **Create directory structure**
   ```
   portfolio/
   ├── index.html
   ├── style.css
   ├── script.js
   ├── assets/
   │   └── img/
   │       ├── profile.jpg
   │       ├── about.jpg
   │       ├── project1.jpg
   │       ├── project2.jpg
   │       ├── project3.jpg
   │       └── project4.jpg
   └── README.md
   ```

3. **Replace images**
   - Add your profile photo and project images to the `assets/img/` folder

4. **Customize content**
   - Edit the `index.html` file to update personal information, skills, projects, etc.
   - Adjust colors and styling in `style.css` if desired

5. **Create a new GitHub repository**
   - Name it `yourusername.github.io` for GitHub Pages hosting

6. **Push your code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial portfolio commit"
   git remote add origin https://github.com/yourusername/yourusername.github.io.git
   git push -u origin main
   ```

7. **Enable GitHub Pages**
   - Go to repository Settings > Pages
   - Set source branch to `main`
   - Your site will be published at `https://yourusername.github.io/`

## 🔧 Customization Guide

### Changing Colors

The color scheme can be easily modified by editing the CSS variables in the `:root` section of `style.css`:

```css
:root {
    --primary-color: #4361ee;
    --secondary-color: #3a0ca3;
    --accent-color: #4cc9f0;
    /* other variables */
}
```

### Adding New Projects

To add a new project, copy the following HTML structure and paste it in the projects grid section:

```html
<div class="project-item category" data-aos="fade-up" data-aos-delay="X00">
    <div class="project-card">
        <div class="project-img">
            <img src="assets/img/project-new.jpg" alt="Project Title">
            <div class="project-category">Category</div>
        </div>
        <div class="project-info">
            <h3>Project Title</h3>
            <p>Project description here...</p>
            <div class="project-stats">
                <div class="stat">
                    <i class="fas fa-icon"></i>
                    <span>Statistic</span>
                </div>
            </div>
            <div class="project-tech">
                <span>Tech 1</span>
                <span>Tech 2</span>
                <span>Tech 3</span>
            </div>
            <div class="project-links">
                <a href="#" class="project-link"><i class="fas fa-eye"></i> View Project</a>
            </div>
        </div>
    </div>
</div>
```

Replace:
- `category` with your project category (wordpress, shopify, or other)
- `X00` with a delay value (e.g., 200, 300, 400)
- `project-new.jpg` with your project image
- Other content with your project details

### Adding New Skills

To add a new skill, find the appropriate skills group and add:

```html
<div class="skill-card">
    <div class="skill-icon"><i class="fab fa-icon"></i></div>
    <div class="skill-info">
        <h3>Skill Name</h3>
        <div class="skill-bar"><span style="width:X%"></span></div>
    </div>
</div>
```

Replace:
- `fa-icon` with the appropriate Font Awesome icon class
- `Skill Name` with your skill name
- `X%` with your proficiency level (0-100)

## 📱 Making it Mobile-Friendly

The portfolio is already responsive, but here are some tips for ensuring the best experience on all devices:

1. **Test on multiple devices and browsers**
2. **Optimize images** for faster loading (compress them before uploading)
3. **Use responsive units** (rem, %, vh/vw) instead of fixed pixel values
4. **Ensure touch targets** are at least 44px × 44px for better mobile usability

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 📞 Contact

If you have any questions or suggestions, feel free to reach out:

- Email: rajdwaipayan@gmail.com
- LinkedIn: [linkedin.com/in/dwaipyan-mandal-cyber-sec](https://www.linkedin.com/in/dwaipyan-mandal-cyber-sec)
- GitHub: [github.com/rajdwaipyan](https://github.com/rajdwaipyan)
