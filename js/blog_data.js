// Blog data array - You can add more blogs here
const blogsData = [
  {
    id: 1,
    image: '/assests/blog1.jpeg',
    title: 'Navigating Your Loan Options: A State-by-State Guide for Every Australian | Finco Capital',
    date: 'NOVEMBER 13, 2025',
    author: 'TECHNITY',
    comments: 'NO COMMENTS',
    content: 'Australia\'s lending landscape varies significantly across different states and territories. Whether you\'re looking for a home loan, commercial loan, or SMSF loan, understanding the unique requirements and opportunities in your state is crucial. At Finco Capital, we provide tailored solutions that account for state-specific regulations, market conditions, and lending practices. From New South Wales to Western Australia, each state has its own advantages for borrowers. Our expert team guides you through every state\'s specific loan options, helping you make informed decisions about your financial future. We ensure that your loan aligns perfectly with your state\'s economic landscape and your personal financial goals.'
  },
  {
    id: 2,
    image: '/assests/blog2.jpeg',
    title: 'Smart Investment Strategies for a Stronger Financial Future',
    date: 'NOVEMBER 13, 2025',
    author: 'TECHNITY',
    comments: 'NO COMMENTS',
    content: 'Building wealth requires strategic planning and disciplined execution. Smart investment strategies go beyond simply saving money; they involve understanding market dynamics, diversifying your portfolio, and making informed decisions about where your money grows. At Finco Capital, we help you develop investment strategies that align with your long-term goals. Whether you\'re investing through property, business expansion, or other ventures, we provide the financial support and guidance you need. Our expert advisors understand market trends and can help you identify opportunities that maximize your returns while minimizing risks. Start your journey towards financial independence today with proven investment strategies.'
  },
  {
    id: 3,
    image: '/assests/blog3.jpeg',
    title: 'Why Australians Are Choosing Finco Capital for Personal Loans',
    date: 'NOVEMBER 13, 2025',
    author: 'TECHNITY',
    comments: 'NO COMMENTS',
    content: 'Personal loans are the foundation of modern financial planning. Australians choose Finco Capital because we offer competitive rates, transparent terms, and hassle-free approval processes. Our personal loan products are designed with Australian borrowers in mind, considering their unique financial situations and goals. Whether you need funds for home improvements, education, debt consolidation, or emergency expenses, we have flexible solutions that work for you. Our customers appreciate our commitment to fast processing, clear communication, and personalized service. With Finco Capital, you get more than just a loan—you get a partner in your financial success.'
  },
  {
    id: 4,
    image: '/assests/blog4.jpg',
    title: 'Home Loan Refinancing: When and How to Make the Right Move',
    date: 'DECEMBER 05, 2025',
    author: 'TECHNITY',
    comments: 'NO COMMENTS',
    content: 'Refinancing your home loan can save you thousands of dollars over the life of your mortgage. The right time to refinance depends on several factors including interest rate movements, your current loan terms, and your financial situation. At Finco Capital, we help you analyze whether refinancing makes sense for your circumstances. Lower interest rates, better loan terms, or the desire to pay off your loan faster are all valid reasons to consider refinancing. Our expert team evaluates your options and guides you through the process smoothly. Refinancing can also help you access equity in your home for investments or major expenses. Don\'t miss the opportunity to improve your financial position through strategic refinancing.'
  },
  {
    id: 5,
    image: '/assests/blog5.webp',
    title: 'Commercial Loans: Fueling Business Growth and Expansion',
    date: 'DECEMBER 08, 2025',
    author: 'TECHNITY',
    comments: 'NO COMMENTS',
    content: 'Growing a business requires capital, and commercial loans are the fuel that drives expansion. Whether you\'re establishing a new venture, expanding operations, or purchasing equipment and inventory, the right commercial financing makes all the difference. Finco Capital specializes in commercial loans tailored to your business needs. We understand the challenges of business owners and provide flexible terms that support your growth plans. From working capital to equipment financing, we offer solutions that help you seize opportunities without straining your cash flow. Our experienced team works with you to structure financing that aligns with your business strategy and revenue projections.'
  },
  {
    id: 6,
    image: '/assests/blog6.jpg',
    title: 'SMSF Loans: Building Retirement Wealth on Your Terms',
    date: 'DECEMBER 10, 2025',
    author: 'TECHNITY',
    comments: 'NO COMMENTS',
    content: 'Self-Managed Super Funds (SMSFs) offer greater control over your retirement savings and investment strategy. SMSF loans through Finco Capital allow you to invest in property or other assets to boost your retirement wealth. With an SMSF loan, you can leverage your super balance to acquire investments that generate income and capital growth over time. This strategy has helped many Australians build substantial retirement portfolios. Our SMSF specialists understand the regulatory requirements and tax implications, ensuring your investments comply with ATO guidelines. Whether you\'re considering residential or commercial property investment within your SMSF, we provide expert guidance and competitive loan terms.'
  },
  {
    id: 7,
    image: '/assests/blog7.webp',
    title: 'Debt Consolidation: Simplify Payments and Save on Interest',
    date: 'DECEMBER 12, 2025',
    author: 'TECHNITY',
    comments: 'NO COMMENTS',
    content: 'Managing multiple debts with different interest rates and payment schedules can be overwhelming and expensive. Debt consolidation combines all your debts into a single, manageable loan with one payment. This strategy can significantly reduce your interest costs and simplify your financial life. Finco Capital offers debt consolidation loans designed to help you regain control of your finances. By consolidating high-interest debts like credit cards into a lower-interest loan, you can accelerate debt repayment and improve your financial situation. Our advisors help you analyze whether consolidation is right for your situation and structure a plan that works for your budget and goals.'
  },
  {
    id: 8,
    image: '/assests/blog8.webp',
    title: 'First-Time Home Buyer\'s Guide: Your Path to Homeownership',
    date: 'DECEMBER 15, 2025',
    author: 'TECHNITY',
    comments: 'NO COMMENTS',
    content: 'Buying your first home is an exciting milestone and a major financial decision. First-time buyers often face challenges in understanding the process, managing deposits, and securing favorable loan terms. Finco Capital specializes in first-time buyer home loans with competitive rates and flexible terms. We guide you through every step, from pre-approval to settlement, ensuring you understand your options and obligations. Our loan products are designed specifically for first-time buyers, with features that recognize your unique situation. We help you maximize your borrowing capacity while maintaining a sustainable debt level. Your dream home is within reach with the right financial partner.'
  },
  {
    id: 9,
    image: '/assests/blog9.webp',
    title: 'Financial Planning for Self-Employed Professionals: Stability and Growth',
    date: 'DECEMBER 18, 2025',
    author: 'TECHNITY',
    comments: 'NO COMMENTS',
    content: 'Self-employed professionals face unique financial challenges including irregular income, higher tax obligations, and difficulty accessing traditional financing. Finco Capital understands the self-employed sector and offers loans specifically designed for freelancers, contractors, and business owners. We evaluate your financial situation based on your actual earning capacity rather than rigid employment criteria. Whether you need working capital, business expansion funding, or a personal loan, we have solutions that work for self-employed professionals. Our flexible underwriting process considers your business history, income trends, and growth potential. Building financial stability as a self-employed professional is achievable with the right support and financing strategy.'
  }
];

// Function to render blog cards dynamically
function renderBlogs(containerId, limit = null) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // If limit is specified, show only that many blogs
  const blogsToShow = limit ? blogsData.slice(0, limit) : blogsData;

  let blogsHTML = '';
  blogsToShow.forEach(blog => {
    // Check if it's home page or blog page
    const isHomePage = containerId === 'blog-cards-home';
    const onClickHandler = isHomePage 
      ? `onclick="openBlogModal(${blog.id})"` 
      : `onclick="viewBlogDetail(${blog.id})"`;
    
    blogsHTML += `
      <div class="blog-card" ${onClickHandler} style="cursor: pointer;">
        <img src="${blog.image}" alt="${blog.title}" loading="lazy">
        <h3>${blog.title}</h3>
        <span class="blog-meta">${blog.author} - ${blog.date} - ${blog.comments}</span>
      </div>
    `;
  });

  container.innerHTML = blogsHTML;
}

// Function to display single blog detail in MODAL (HOME PAGE ONLY)
function openBlogModal(blogId) {
  const blog = blogsData.find(b => b.id === blogId);
  if (!blog) return;

  // Create modal HTML
  const modalHTML = `
    <div class="blog-modal-overlay" onclick="closeBlogModal(event)">
      <div class="blog-modal-content" onclick="event.stopPropagation()">
        <button class="blog-modal-close" onclick="closeBlogModal()">×</button>
        <article class="blog-detail-article">
          <img src="${blog.image}" alt="${blog.title}" class="blog-detail-image">
          <div class="blog-detail-header">
            <h1>${blog.title}</h1>
            <span class="blog-detail-meta">${blog.author} - ${blog.date} - ${blog.comments}</span>
          </div>
          <div class="blog-detail-content">
            <p>${blog.content}</p>
          </div>
        </article>
      </div>
    </div>
  `;

  // Remove old modal if exists
  const oldModal = document.querySelector('.blog-modal-overlay');
  if (oldModal) oldModal.remove();

  // Add modal to body
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Prevent body scroll
  document.body.style.overflow = 'hidden';
}

// Function to close blog modal
function closeBlogModal(event) {
  // If clicked on overlay (not content), close it
  if (event && event.target.className !== 'blog-modal-overlay') return;
  
  const modal = document.querySelector('.blog-modal-overlay');
  if (modal) {
    modal.remove();
    document.body.style.overflow = 'auto';
  }
}

// Function to display single blog detail in FULL PAGE (BLOG PAGE ONLY)
function viewBlogDetail(blogId) {
  const blog = blogsData.find(b => b.id === blogId);
  if (!blog) return;

  // Create detail view HTML
  const detailHTML = `
    <div class="blog-detail-view">
      
      <article class="blog-detail-article">
        <img src="${blog.image}" alt="${blog.title}" class="blog-detail-image">
        <div class="blog-detail-header">
          <h1>${blog.title}</h1>
          <span class="blog-detail-meta">${blog.author} - ${blog.date} - ${blog.comments}</span>
        </div>
        <div class="blog-detail-content">
          <p>${blog.content}</p>
        </div>
      </article>
      <div class="blog-detail-button">
      <button class="blog-back-btn" onclick="closeBlogDetail()">← Back to All Blogs</button>
      </div>
    </div>
  `;

  // Get the blog section or container
  const blogSection = document.querySelector('.blog-section');
  if (blogSection) {
    // Store original content if not already stored
    if (!blogSection.dataset.originalContent) {
      blogSection.dataset.originalContent = blogSection.innerHTML;
    }
    
    // Replace with detail view
    blogSection.innerHTML = detailHTML;
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// Function to close blog detail and return to list
function closeBlogDetail() {
  const blogSection = document.querySelector('.blog-section');
  if (blogSection && blogSection.dataset.originalContent) {
    blogSection.innerHTML = blogSection.dataset.originalContent;
    
    // Re-attach event listeners to blog cards
    const isFullPage = document.getElementById('blog-cards-full') !== null;
    if (isFullPage) {
      renderBlogs('blog-cards-full');
    }
  }
}

// Close modal on Escape key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeBlogModal();
  }
});

// Initialize blogs when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // On index page, show only 3 blogs
  if (document.getElementById('blog-cards-home')) {
    renderBlogs('blog-cards-home', 3);
  }
  
  // On blog page, show all blogs
  if (document.getElementById('blog-cards-full')) {
    renderBlogs('blog-cards-full');
  }
});
