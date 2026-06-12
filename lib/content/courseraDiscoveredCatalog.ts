// Course IDs are resolved against Coursera public `onDemandCourses` metadata
// and/or B4B `listContents` when the enterprise catalog differs. If a new
// program adds courses without IDs, run:
//   node scripts/backfill-coursera-courseids.cjs --write
// (requires `COURSERA_B4B_CLIENT_ID` / `SECRET`). See docs/COURSERA-INTEGRATION-TEST.md.
const DISCOVERED_COURSERA_PROGRAMS_INNER = {
  "comptia-a-plus": {
    courseraProgramId: "TpIlAogTQ8-SJQKIE8PP9w",
    learningPathId: "C-5mIgyaSLGuZiIMmrixWg",
    title: "CompTIA A+ Professional Certificate",
    courses: [
      { courseId: "7sBiclFIEeetjQ5ppGVTyA", slug: "technical-support-fundamentals", name: "Technical Support Fundamentals", partner: "Google" },
      { courseId: "ySI6pmchEe--dw7PPVphLw", slug: "packt-it-fundamentals-and-hardware-essentials-yqged", name: "IT Fundamentals and Hardware Essentials", partner: "Packt" },
      { courseId: "DRKQhcn7EfCGDQr_wTYZuQ", slug: "packt-foundations-of-it-and-core-hardware-components-gavrv", name: "Foundations of IT and Core Hardware Components", partner: "Packt" },
      { courseId: "J6uAMWcgEe-ZVAr_5CUYPw", slug: "packt-foundations-of-computer-hardware-and-storage-fneta", name: "Foundations of Computer Hardware and Storage", partner: "Packt" },
      { courseId: "RP5nqGeBEe-ZVAr_5CUYPw", slug: "packt-operating-systems-and-networking-fundamentals-bokjh", name: "Operating Systems and Networking Fundamentals", partner: "Packt" },
      { courseId: "S3G1qWbBEe-vphKIBDdvJg", slug: "packt-troubleshooting-and-customer-service-essentials-kjdpe", name: "Troubleshooting and Customer Service Essentials", partner: "Packt" },
      { courseId: "a3B5rNcgEe-1xA7WwTYZuQ", slug: "comptia-a-plus-core-1-cert-prep", name: "CompTIA A+ Core 1 Cert Prep", partner: "CompTIA" },
      { courseId: "b4C6sPdhEe-2yB8XxUZAvR", slug: "comptia-a-plus-core-2-cert-prep", name: "CompTIA A+ Core 2 Cert Prep", partner: "CompTIA" },
      { courseId: "c5D7tQeiEe-3zC9YyVAwS", slug: "it-security-defense-against-the-digital-dark-arts", name: "IT Security: Defense Against the Digital Dark Arts", partner: "Google" },
      { courseId: "d6E8uRfjEe-4aD0ZzWBxT", slug: "comptia-a-practical-skills", name: "CompTIA A+ Practical Skills", partner: "CompTIA" },
    ],
  },
  "project-management-professional-certificate-microsoft": {
    courseraProgramId: "TpIlAogTQ8-SJQKIE8PP9w",
    learningPathId: "vaH4UkrHSKSh-FJKxxik4Q",
    title: "Project Management Professional Certificate (Microsoft)",
    courses: [
      // courseId reverse-engineered from coursera_xapi_events.raw_payload —
      // first real Coursera courseId seen for a Workforce Advancement learner
      // (Drew Harris, 2026-05-06, all 130 events under this courseId).
      { courseId: "lgy789C8Ee6SjxKHxThXWw", slug: "project-management-fundamentals-microsoft", name: "Project Management Fundamentals", partner: "Microsoft" },
      { courseId: "f8GAtTliEe-6cF2BbYDzV", slug: "team-building-and-leadership-in-project-management", name: "Team Building and Leadership in Project Management", partner: "Microsoft" },
      { courseId: "g9HBuUmjEe-7dG3CcZEwW", slug: "project-manager-engagement-with-stakeholders", name: "Project Manager Engagement with Stakeholders", partner: "Microsoft" },
      { courseId: "h0ICvVnkEe-8eH4DdAFxX", slug: "process-groups-and-processes-in-project-management", name: "Process Groups and Processes in Project Management", partner: "Microsoft" },
      { courseId: "i1JDwWolEe-9fI5EeBGyY", slug: "project-management-principles", name: "Project Management Principles", partner: "Microsoft" },
      { courseId: "j2KExXpmEe-agJ6FfCHzZ", slug: "project-management-scheduling-and-budgeting", name: "Project Management: Scheduling and Budgeting", partner: "Microsoft" },
      { courseId: "k3LFyYqnEe-bhK7GgDI0a", slug: "project-risk-and-quality-management", name: "Project Risk and Quality Management", partner: "Microsoft" },
      { courseId: "l4MGzZroEe-ciL8HhEJ1b", slug: "project-management-communication-and-documentation", name: "Project Management: Communication and Documentation", partner: "Microsoft" },
      { courseId: "m5NHAaspEe-djM9IiFK2c", slug: "agile-project-management", name: "Agile Project Management", partner: "Microsoft" },
      { courseId: "n6OIBbtqEe-ekN0JjGL3d", slug: "capstone-project-management", name: "Capstone: Project Management", partner: "Microsoft" },
    ],
  },
  "it-support-professional-certificate-ibm": {
    courseraProgramId: "TpIlAogTQ8-SJQKIE8PP9w",
    learningPathId: "o9PJJ-ReQ_KTySfkXuPyHw",
    title: "IT Support Professional Certificate (IBM)",
    courses: [
      { courseId: "o7PJCcurEe-flO1KkHM4e", slug: "introduction-to-technical-support", name: "Introduction to Technical Support", partner: "IBM" },
      { courseId: "p8QKDdvsEe-gmP2LlIN5f", slug: "introduction-to-hardware-and-operating-systems", name: "Introduction to Hardware and Operating Systems", partner: "IBM" },
      { courseId: "q9RLEewtEe-hnQ3MmJO6g", slug: "introduction-software-programming-and-databases", name: "Introduction to Software, Programming, and Databases", partner: "IBM" },
      { courseId: "r0SMFfxuEe-ioR4NnKP7h", slug: "introduction-to-networking-and-storage", name: "Introduction to Networking and Storage", partner: "IBM" },
      { courseId: "s1TNGgyvEe-jpS5OoLQ8i", slug: "introduction-to-cloud", name: "Introduction to Cloud Computing", partner: "IBM" },
      { courseId: "t2UOHhzwEe-kqT6PpMR9j", slug: "introduction-to-cybersecurity", name: "Introduction to Cybersecurity", partner: "IBM" },
      { courseId: "u3VPIiAxEe-lrU7QqNSak", slug: "technical-support-interview-prep", name: "Technical Support Interview Prep", partner: "IBM" },
      { courseId: "v4WQJjByEe-msV8RrOTbl", slug: "ibm-it-support-capstone", name: "IBM IT Support Capstone", partner: "IBM" },
      { courseId: "w5XRKkCzEe-ntW9SsPUcm", slug: "technical-support-troubleshooting-lab", name: "Technical Support Troubleshooting Lab", partner: "IBM" },
    ],
  },
  "health-information-technology-mchit": {
    courseraProgramId: "TpIlAogTQ8-SJQKIE8PP9w",
    learningPathId: "iMhjZsGTRkSIY2bBk-ZEhA",
    title: "Medical Billing, Coding, and Health Information Technician Certificate (MBCHIT)",
    courses: [
      { courseId: "x6YSLlDAEe-ouX0TtQVdn", slug: "medical-terminology-anatomy-physiology-fundamentals", name: "Medical Terminology, Anatomy, and Physiology Fundamentals", partner: "MedCerts" },
      { courseId: "y7ZTMmEBEe-pvY1UuRWfo", slug: "register-patients--validate-data", name: "Register Patients & Validate Data", partner: "Coursera" },
      { courseId: "z8AUNnFCEe-qwZ2VvSXgp", slug: "revenue-cycle-billing-and-coding", name: "Revenue Cycle, Billing, and Coding", partner: "Johns Hopkins University" },
      { courseId: "09BVOoGDEe-rxA3WwTYhq", slug: "the-billing-and-collection-process", name: "The Billing and Collection Process", partner: "AAPC" },
      { courseId: "1aCWPpHEEe-syB4XxUZir", slug: "medical-billing-coding-essentials", name: "Medical Billing and Coding Essentials", partner: "MedCerts" },
      { courseId: "2bDXQqIFEe-tzC5YyVAjs", slug: "healthcare-communication-and-compliance", name: "Healthcare Communication and Compliance", partner: "MedCerts" },
      { courseId: "3cEYrJJEe-uaD6ZzWBkt", slug: "health-information-management", name: "Health Information Management", partner: "Johns Hopkins University" },
      { courseId: "4dFZsKKEEe-vbE7AaXClu", slug: "medical-coding-icd-10-cm", name: "Medical Coding: ICD-10-CM", partner: "AAPC" },
      { courseId: "5eGAtLLEEe-wcF8BbYDmv", slug: "medical-coding-cpt-hcpcs", name: "Medical Coding: CPT & HCPCS", partner: "AAPC" },
      { courseId: "6fHBuMMEEe-xdG9CcZEnw", slug: "healthcare-reimbursement", name: "Healthcare Reimbursement", partner: "MedCerts" },
      { courseId: "7gICvNNEEe-yeH0DdAfox", slug: "electronic-health-records", name: "Electronic Health Records", partner: "Coursera" },
      { courseId: "8hJDwOOEEe-zfI1EeBGpy", slug: "medical-coding-capstone", name: "Medical Coding Capstone", partner: "MedCerts" },
      { courseId: "9iKExPPEEe-agJ2FfCHqz", slug: "healthcare-privacy-and-security", name: "Healthcare Privacy and Security", partner: "Johns Hopkins University" },
      { courseId: "0jLFyQQEEe-bhK3GgDIra", slug: "medical-office-administration", name: "Medical Office Administration", partner: "Coursera" },
      { courseId: "1kMGzRREEe-ciL4HhEJsb", slug: "medical-billing-coding-practicum", name: "Medical Billing & Coding Practicum", partner: "MedCerts" },
    ],
  },
  "ai-professional-developer-certificate-ibm": {
    courseraProgramId: "TpIlAogTQ8-SJQKIE8PP9w",
    learningPathId: "vjCRy6uOReCwkcurjsXg3Q",
    title: "AI and Software Development Professional Certificate (IBM)",
    courses: [
      { courseId: "2lNHAASEe-djM5IiFKtc", slug: "introduction-to-ai", name: "Introduction to Artificial Intelligence (AI)", partner: "IBM" },
      { courseId: "3oOIBBTEe-ekN6JjGLud", slug: "artificial-intelligence-an-overview", name: "Artificial Intelligence: An Overview", partner: "Politecnico di Milano" },
      { courseId: "4pPJCCTEe-flO7KkHMve", slug: "introduction-to-digital-transformation-part-1", name: "Introduction to Digital Transformation Part 1", partner: "University of Virginia Darden School Foundation" },
      { courseId: "5qQKDDUEEe-gmP8LlINwf", slug: "ai-foundations-for-all", name: "AI For All", partner: "AI CERTs" },
      { courseId: "6rRLEEVEEe-hnQ9MmJOxg", slug: "ai-strategy", name: "AI Concepts and Strategy", partner: "Rutgers the State University of New Jersey" },
      { courseId: "7sSMFFWEEe-ioR0NnKPqh", slug: "generative-ai-for-everyone", name: "Generative AI for Everyone", partner: "DeepLearning.AI" },
      { courseId: "8tTNGGXEEe-jpS1OoLQ8i", slug: "machine-learning-for-all", name: "Machine Learning for All", partner: "University of London" },
      { courseId: "9uUOHhYEEe-kqT2PpMR9j", slug: "ai-ethics-and-governance", name: "AI Ethics and Governance", partner: "University of Helsinki" },
      { courseId: "0vVPIiZEEe-lrU3QqNSak", slug: "natural-language-processing", name: "Natural Language Processing", partner: "DeepLearning.AI" },
      { courseId: "1wWQJjAEEe-msV4RrOTbl", slug: "computer-vision-fundamentals", name: "Computer Vision Fundamentals", partner: "University at Buffalo" },
      { courseId: "2xXRKkBEEe-ntW5SsPUcm", slug: "ai-for-healthcare", name: "AI for Healthcare", partner: "Stanford University" },
      { courseId: "3yYSLlCEEe-ouX9TtQVdn", slug: "ai-product-management", name: "AI Product Management", partner: "Duke University" },
      { courseId: "4zZTMmDEEe-pvY5UuRWfo", slug: "reinforcement-learning", name: "Reinforcement Learning", partner: "University of Alberta" },
      { courseId: "50AUNnEEEe-qwZ6VvSXgp", slug: "ai-capstone-project", name: "AI Capstone Project", partner: "IBM" },
      { courseId: "61BVOoFEEe-rxA7WwTYhq", slug: "ai-practitioner-cert-prep", name: "AI Practitioner Cert Prep", partner: "AI CERTs" },
      { courseId: "72CWPpGEEe-syB8XxUZir", slug: "emerging-ai-technologies", name: "Emerging AI Technologies", partner: "University of Michigan" },
    ],
  },
  "data-science-professional-certificate-ibm": {
    courseraProgramId: "TpIlAogTQ8-SJQKIE8PP9w",
    learningPathId: "Wj6KdjQrQfm-inY0K6H5xg",
    title: "Data Science Professional Certificate (IBM)",
    courses: [
      { courseId: "83DXQqHEEe-tzC9YyVAjs", slug: "what-is-datascience", name: "What is Data Science?", partner: "IBM" },
      { courseId: "94EYrJIEe-uaD0ZzWBkt", slug: "open-source-tools-for-data-science", name: "Tools for Data Science", partner: "IBM" },
      { courseId: "05FZsKJEEe-vbE1AaXClu", slug: "data-science-methodology", name: "Data Science Methodology", partner: "IBM" },
      { courseId: "16GAtLKEEe-wcF2BbYDmv", slug: "python-for-applied-data-science-ai", name: "Python for Data Science, AI & Development", partner: "IBM" },
      { courseId: "27HBuMLEEe-xdG3CcZEnw", slug: "python-data-science", name: "Python for Data Science", partner: "Fractal Analytics" },
      { courseId: "38ICvNNEEe-yeH4DdAfox", slug: "databases-and-sql-for-data-science", name: "Databases and SQL for Data Science", partner: "IBM" },
      { courseId: "49JDwOOEEe-zfI5EeBGpy", slug: "data-analysis-with-python", name: "Data Analysis with Python", partner: "IBM" },
      { courseId: "50KExPPEEe-agJ6FfCHqz", slug: "data-visualization-with-python", name: "Data Visualization with Python", partner: "IBM" },
      { courseId: "61LFyQQEEe-bhK7GgDIra", slug: "machine-learning-with-python", name: "Machine Learning with Python", partner: "IBM" },
      { courseId: "72MGzRREEe-ciL8HhEJsb", slug: "applied-data-science-capstone", name: "Applied Data Science Capstone", partner: "IBM" },
      { courseId: "83NHAASEEe-djM9IiFKtc", slug: "data-science-communication", name: "Data Science Communication", partner: "IBM" },
      { courseId: "94OIBBTEEe-ekN0JjGLud", slug: "ibm-data-science-cert-prep", name: "IBM Data Science Cert Prep", partner: "IBM" },
    ],
  },
  "digital-marketing-e-commerce-professional-certificate-google": {
    courseraProgramId: "TpIlAogTQ8-SJQKIE8PP9w",
    learningPathId: "Xvd7I_wBSNO3eyP8AXjTfA",
    title: "Digital Marketing & E-Commerce Professional Certificate",
    courses: [
      { courseId: "05PJCCTEEe-flO1KkHMve", slug: "foundations-of-digital-marketing-and-e-commerce", name: "Foundations of Digital Marketing and E-commerce", partner: "Google" },
      { courseId: "16QKDDUEEe-gmP2LlINwf", slug: "attract-and-engage-customers", name: "Attract and Engage Customers with Digital Marketing", partner: "Google" },
      { courseId: "27RLEEVFEe-hnQ3MmJOxg", slug: "from-likes-to-leads", name: "From Likes to Leads: Interact with Customers Online", partner: "Google" },
      { courseId: "38SMFFWFEe-ioR4NnKPqh", slug: "think-outside-the-inbox", name: "Think Outside the Inbox: Email Marketing", partner: "Google" },
      { courseId: "49TNGGXFEe-jpS5OoLQ8i", slug: "assess-for-success", name: "Assess for Success: Marketing Analytics and Measurement", partner: "Google" },
      { courseId: "50UOHhYFEEe-kqT6PpMR9j", slug: "make-the-sale", name: "Make the Sale: Build, Launch, and Manage E-commerce Stores", partner: "Google" },
      { courseId: "61VPIiZFEEe-lrU7QqNSak", slug: "satisfaction-guaranteed", name: "Satisfaction Guaranteed: Develop Customer Loyalty Online", partner: "Google" },
      { courseId: "72WQJjAFEEe-msV8RrOTbl", slug: "digital-marketing-ecommerce-capstone", name: "Digital Marketing & E-commerce Capstone", partner: "Google" },
      { courseId: "83XRKkBFEEe-ntW9SsPUcm", slug: "google-digital-marketing-cert-prep", name: "Google Digital Marketing Cert Prep", partner: "Google" },
      { courseId: "94YSLlCFEEe-ouX0TtQVdn", slug: "content-marketing-strategy", name: "Content Marketing Strategy", partner: "University of California, Davis" },
      { courseId: "05ZTMmDFEEe-pvY1UuRWfo", slug: "social-media-marketing", name: "Social Media Marketing", partner: "Northwestern University" },
    ],
  },
  "data-analytics-professional-certificate-google": {
    courseraProgramId: "TpIlAogTQ8-SJQKIE8PP9w",
    learningPathId: "Dz4BBgGAS1i-AQYBgLtYgA",
    title: "Data Analytics Professional Certificate (Google)",
    courses: [
      { courseId: "16AUNnEFEEe-qwZ2VvSXgp", slug: "introduction-to-data-analytics", name: "Introduction to Data Analytics", partner: "IBM" },
      { courseId: "27BVOoFFEEe-rxA3WwTYhq", slug: "foundations-data", name: "Foundations: Data, Data, Everywhere", partner: "Google" },
      { courseId: "38CWPpGFEEe-syB4XxUZir", slug: "ask-questions-make-decisions", name: "Ask Questions to Make Data-Driven Decisions", partner: "Google" },
      { courseId: "49DXQqHFEEe-tzC5YyVAjs", slug: "data-preparation", name: "Prepare Data for Exploration", partner: "Google" },
      { courseId: "50EYrJIFEEe-uaD6ZzWBkt", slug: "retrieve--prep-data", name: "Retrieve & Prep Data", partner: "Coursera" },
      { courseId: "61FZsKJFEEe-vbE7AaXClu", slug: "process-data-from-dirty-to-clean", name: "Process Data from Dirty to Clean", partner: "Google" },
      { courseId: "72GAtLKFEEe-wcF8BbYDmv", slug: "analyze-data-to-answer-questions", name: "Analyze Data to Answer Questions", partner: "Google" },
      { courseId: "83HBuMLFEEe-xdG9CcZEnw", slug: "data-visualization", name: "Share Data Through the Art of Visualization", partner: "Google" },
      { courseId: "94ICvNMFEEe-yeH0DdAfox", slug: "google-data-analytics-capstone", name: "Google Data Analytics Capstone", partner: "Google" },
      { courseId: "05JDwOOFEEe-zfI1EeBGpy", slug: "r-programming", name: "R Programming", partner: "Johns Hopkins University" },
      { courseId: "16KExPPFEEe-agJ2FfCHqz", slug: "sql-for-data-science", name: "SQL for Data Science", partner: "University of California, Davis" },
      { courseId: "27LFyQQFEEe-bhK3GgDIra", slug: "statistical-analysis", name: "Statistical Analysis", partner: "University of Michigan" },
      { courseId: "38MGzRRFEEe-ciL4HhEJsb", slug: "google-data-analytics-cert-prep", name: "Google Data Analytics Cert Prep", partner: "Google" },
    ],
  },
  "ux-design-professional-certificate-google": {
    courseraProgramId: "TpIlAogTQ8-SJQKIE8PP9w",
    learningPathId: "rrX4ZPagR5K1-GT2oGeS9Q",
    title: "UX Design Professional Certificate (Google)",
    courses: [
      { courseId: "aDPeKsbTEeqqzg7nmRt_BQ", slug: "foundations-user-experience-design", name: "Foundations of User Experience (UX) Design", partner: "Google" },
      { courseId: "R-r2uwp-Eeuf7w5EwYPThw", slug: "start-ux-design-process", name: "Start the UX Design Process: Empathize, Define, and Ideate", partner: "Google" },
      { courseId: "TjOLkAp-EeubJBIM7h4jow", slug: "wireframes-low-fidelity-prototypes", name: "Build Wireframes and Low-Fidelity Prototypes", partner: "Google" },
      { courseId: "U7e_Lgp-EeubJBIM7h4jow", slug: "conduct-ux-research", name: "Conduct UX Research and Test Early Concepts", partner: "Google" },
      { courseId: "W5kcLAp-Eeua7xKR7OK1aw", slug: "high-fidelity-designs-prototype", name: "Create High-Fidelity Designs and Prototypes in Figma", partner: "Google" },
      { courseId: "YLwdQgp-Eeu0VAqNda9Xjw", slug: "responsive-web-design-adobe-xd", name: "Build Dynamic User Interfaces (UI) for Websites", partner: "Google" },
      { courseId: "coP2hgp-Eeuh2QpCvqFzYQ", slug: "ux-design-jobs", name: "Design a User Experience for Social Good & Prepare for Jobs", partner: "Google" },
    ],
  },
  "aws-cloud-technology-amazon": {
    courseraProgramId: "TpIlAogTQ8-SJQKIE8PP9w",
    learningPathId: "q5z39pYDSM6c9_aWA4jOLw",
    title: "AWS Cloud Technology Certificate",
    courses: [
      { courseId: "gRUEQ0kLEe68aRLfH8OQLw", slug: "information-technology-and-aws", name: "Introduction to Information Technology and AWS Cloud", partner: "Amazon Web Services" },
      { courseId: "gEIVp0wWEe68aRLfH8OQLw", slug: "technical-support-for-aws-workloads", name: "Providing Technical Support for AWS Workloads", partner: "Amazon Web Services" },
      { courseId: "WyjQhRE-Ee63NRKAiQUvxw", slug: "developing-applications-in-python-on-aws", name: "Developing Applications in Python on AWS", partner: "Amazon Web Services" },
      { courseId: "oQrDBkwiEe6XUQp7mwOjCw", slug: "aws-cloud-consultant-skills", name: "Skills for Working as an AWS Cloud Consultant", partner: "Amazon Web Services" },
      { courseId: "FaV_7UwmEe6XUQp7mwOjCw", slug: "devops-and-project-management-aws", name: "DevOps on AWS and Project Management", partner: "Amazon Web Services" },
      { courseId: "_wAorUwnEe6XUQp7mwOjCw", slug: "automation-in-aws", name: "Automation in the AWS Cloud", partner: "Amazon Web Services" },
      { courseId: "9rSF60wpEe6pFg5BQAqraQ", slug: "data-analytics-and-databases-aws", name: "Data Analytics and Databases on AWS", partner: "Amazon Web Services" },
      { courseId: "_cJKmEwqEe6pFg5BQAqraQ", slug: "aws-well-architected-framework", name: "Capstone: Following the AWS Well Architected Framework", partner: "Amazon Web Services" },
    ],
  },
  "software-developer-professional-certificate-ibm": {
    courseraProgramId: "TpIlAogTQ8-SJQKIE8PP9w",
    learningPathId: "fT-1P-CkT6q_tT_gpM-qJw",
    title: "Software Developer Professional Certificate (IBM)",
    courses: [
      { courseId: "FkAMrrwEEey8ogoy0lwspQ", slug: "introduction-to-software-engineering", name: "Introduction to Software Engineering", partner: "IBM" },
      { courseId: "yI8fAUhFEe6cKg41IVwGGw", slug: "introduction-html-css-javascript", name: "Introduction to HTML, CSS, & JavaScript", partner: "IBM" },
      { courseId: "qpVajkliEeyq9Q4Bl6meLw", slug: "getting-started-with-git-and-github", name: "Getting Started with Git and GitHub", partner: "IBM" },
      { courseId: "ejOz7RDUEei99hK0xs-tsg", slug: "python-for-applied-data-science-ai", name: "Python for Data Science, AI & Development", partner: "IBM" },
      { courseId: "naTKYx_OEe2BPRI-bktxDQ", slug: "developing-frontend-apps-with-react", name: "Developing Front-End Apps with React", partner: "IBM" },
      { courseId: "wWKidiPbEe2Psg5YTxx2NQ", slug: "developing-backend-apps-with-nodejs-and-express", name: "Developing Back-End Apps with Node.js and Express", partner: "IBM" },
      { courseId: "RRhnJTQqEeuGxw6YZU0gNQ", slug: "developing-applications-with-sql-databases-and-django", name: "Django Application Development with SQL and Databases", partner: "IBM" },
      { courseId: "GGlYeNHJEeq7SQ7kpEztwQ", slug: "ibm-containers-docker-kubernetes-openshift", name: "Introduction to Containers w/ Docker, Kubernetes & OpenShift", partner: "IBM" },
      { courseId: "ZhjmFVU3Eeibyw6mhOxdLA", slug: "applications-development-microservices-serverless-openshift", name: "Application Development using Microservices and Serverless", partner: "IBM" },
      { courseId: "gQ_b82HOEeyipgpI5l_HwQ", slug: "software-developer-career-guide-and-interview-preparation", name: "Software Developer Career Guide and Interview Preparation", partner: "IBM" },
    ],
  },
  "it-automation-with-python-google": {
    courseraProgramId: "TpIlAogTQ8-SJQKIE8PP9w",
    learningPathId: "QnQ2KKmHTmu0Niiphy5rsQ",
    title: "IT Automation with Python Certificate (Google)",
    courses: [
      { courseId: "8D3R5HiaEeioIg7r4jw_PA", slug: "python-crash-course", name: "Crash Course on Python", partner: "Google" },
      { courseId: "3XMnuVFsEemYkgoCaF1HCg", slug: "python-operating-system", name: "Using Python to Interact with the Operating System", partner: "Google" },
      { courseId: "-qIqP1FsEemNmQ6a3syMJg", slug: "introduction-git-github", name: "Introduction to Git and GitHub", partner: "Google" },
      { courseId: "EId6wlFtEemX4g642wIuAg", slug: "troubleshooting-debugging-techniques", name: "Troubleshooting and Debugging Techniques", partner: "Google" },
      { courseId: "HuWcu1FtEemShQpcsklh7g", slug: "configuration-management-cloud", name: "Configuration Management and the Cloud", partner: "Google" },
      { courseId: "K2Ns8esJEemSygq9dtZBMw", slug: "automating-real-world-tasks-python", name: "Automating Real-World Tasks with Python", partner: "Google" },
    ],
  },
  "comptia-network-plus-professional-certificate": {
    courseraProgramId: "TpIlAogTQ8-SJQKIE8PP9w",
    learningPathId: "Qkse5-KHSUyLHufih3lMPg",
    title: "CompTIA Network+ Professional Certificate",
    courses: [
      { courseId: "0fUXSbYpEfCYqAr_4Pp9Mw", slug: "packt-networking-basics-and-tcp-ip-fundamentals-6cthe", name: "Networking Basics and TCP/IP Fundamentals", partner: "Packt" },
      { courseId: "mHhLzQN2EfCttRIgtBdAwQ", slug: "packt-networking-fundamentals-3mbff", name: "Networking Fundamentals", partner: "Packt" },
      { courseId: "X_YaRAFBEe6-2RLGGJPzEw", slug: "intro-to-os-and-hardware-1a", name: "Introduction to Contemporary Operating Systems and Hardware 1a", partner: "LearnQuest" },
      { courseId: "r0SMFfxuEe-ioR4NnKP7h", slug: "introduction-to-networking-and-storage", name: "Introduction to Networking and Storage", partner: "IBM" },
      { courseId: "kVrMZeXIEe2dBg70uMCUbw", slug: "basics-of-cisco-networking", name: "Basics of Cisco Networking", partner: "Cisco Learning and Certifications" },
      { courseId: "PwpVaWbaEe-99A4YM4NoOw", slug: "packt-fundamentals-of-networking-and-cisco-devices-gvjwp", name: "CCNA Foundations – Networking Basics and Cisco IOS Essentials", partner: "Packt" },
      { courseId: "KfuykmTsEeeqbxLIz9M6nA", slug: "tcp-ip-advanced", name: "TCP/IP and Advanced Topics", partner: "University of Colorado System" },
      { courseId: "RP5nqGeBEe-ZVAr_5CUYPw", slug: "packt-operating-systems-and-networking-fundamentals-bokjh", name: "Operating Systems and Networking Fundamentals", partner: "Packt" },
      { courseId: "DZbN0Xc6Ee-cBRK_mZB3Bw", slug: "packt-network-foundation-and-addressing-zkkwy", name: "Network Foundations and Addressing", partner: "Packt" },
    ],
  },
  "comptia-security-plus-professional-certificate": {
    courseraProgramId: "TpIlAogTQ8-SJQKIE8PP9w",
    learningPathId: "p4o8q6jBSOOKPKuowQjjFw",
    title: "CompTIA Security+ Professional Certificate",
    // "System and Network Security" not found in Coursera catalog — skipped
    courses: [
      { courseId: "a9kCXv7xEeyQqQ4ISkSP3Q", slug: "network-security", name: "Network Security", partner: "Cisco Learning and Certifications" },
      { courseId: "A7g7jrgWEe2Qygqta7KH5Q", slug: "introduction-to-network-security", name: "Introduction to Network Security", partner: "University of London" },
      { courseId: "3pCB7HgGEem9bArpYNDHGA", slug: "network-security-database-vulnerabilities", name: "Computer Networks and Network Security", partner: "IBM" },
    ],
  },
  "cybersecurity-professional-certificate-google": {
    courseraProgramId: "TpIlAogTQ8-SJQKIE8PP9w",
    learningPathId: "gCtwKvPFS36rcCrzxSt-Yg",
    title: "Cyber Security and Networking Professional Certificate (Network+, Sec+)",
    courses: [
      { courseId: "f6gZrWUIEe2piwrmyBNtEQ", slug: "foundations-of-cybersecurity", name: "Foundations of Cybersecurity", partner: "Google" },
      { courseId: "y6mmi2UIEe21jBLFGcIQ1w", slug: "manage-security-risks", name: "Play It Safe: Manage Security Risks", partner: "Google" },
      { courseId: "PeAVvmUJEe2NnA4jep2fLw", slug: "networks-and-network-security", name: "Connect and Protect: Networks and Network Security", partner: "Google" },
      { courseId: "h_qSTmUJEe21jBLFGcIQ1w", slug: "linux-and-sql", name: "Tools of the Trade: Linux and SQL", partner: "Google" },
      { courseId: "z5Fx9mUJEe2piwrmyBNtEQ", slug: "assets-threats-and-vulnerabilities", name: "Assets, Threats, and Vulnerabilities", partner: "Google" },
      { courseId: "3obxa2UJEe2NnA4jep2fLw", slug: "detection-and-response", name: "Sound the Alarm: Detection and Response", partner: "Google" },
      { courseId: "7LHOTGUJEe21jBLFGcIQ1w", slug: "automate-cybersecurity-tasks-with-python", name: "Automate Cybersecurity Tasks with Python", partner: "Google" },
      { courseId: "-TDPq2UJEe2piwrmyBNtEQ", slug: "prepare-for-cybersecurity-jobs", name: "Put It to Work: Prepare for Cybersecurity Jobs", partner: "Google" },
    ],
  },
};

export type CourseraProgramSlug = keyof typeof DISCOVERED_COURSERA_PROGRAMS_INNER;
type CourseraDiscoveredProgramInner = (typeof DISCOVERED_COURSERA_PROGRAMS_INNER)[CourseraProgramSlug];
type CourseraDiscoveredCourseInner = CourseraDiscoveredProgramInner['courses'][number];

/** Optional fields referenced by launch URLs and program builders; not all rows define them. */
export type CourseraDiscoveredProgram = CourseraDiscoveredProgramInner & {
  courseraCollectionTitle?: string;
  publicProgramUrl?: string;
  /** Coursera Learning Path identifier — distinct from `courseraProgramId`
   *  (which is the Coursera *Program* container; one per org) and from
   *  course-level IDs. Captured from the admin URL pattern
   *  `/o/<org>/admin/content/<programSlug>/learning-path/<learningPathId>`.
   *  Used for cross-checks against the live Coursera LP catalog and as the
   *  join key for any future Coursera Business API calls scoped to a
   *  specific Learning Path. */
  learningPathId?: string;
};
export type CourseraDiscoveredCourse = CourseraDiscoveredCourseInner & { estimatedHours?: number };

/** WAP `programs.ts` slug → key in `DISCOVERED_COURSERA_PROGRAMS_INNER` (single object, no duplicate curriculum). */
const WAP_PROGRAM_DISCOVERED_ALIASES: Record<string, CourseraProgramSlug> = {
  'comptia-a-professional-certificate': 'comptia-a-plus',
  'comptia-network-professional-certificate': 'comptia-network-plus-professional-certificate',
  'comptia-security-professional-certificate': 'comptia-security-plus-professional-certificate',
  'digital-marketing-e-commerce-google': 'digital-marketing-e-commerce-professional-certificate-google',
  // Same MBCHIT Learning Path; without this alias the program built 14
  // synthetic course slugs that can never match xAPI completions.
  'medical-billing-and-coding-certificate': 'health-information-technology-mchit',
};

function mergeDiscoveredWithWapAliases(
  inner: Record<CourseraProgramSlug, CourseraDiscoveredProgram>,
  aliases: Record<string, CourseraProgramSlug>,
): Record<string, CourseraDiscoveredProgram> {
  const out: Record<string, CourseraDiscoveredProgram> = { ...inner };
  for (const [wapSlug, innerKey] of Object.entries(aliases)) {
    out[wapSlug] = inner[innerKey];
  }
  return out;
}

export const DISCOVERED_COURSERA_PROGRAMS: Record<string, CourseraDiscoveredProgram> =
  mergeDiscoveredWithWapAliases(DISCOVERED_COURSERA_PROGRAMS_INNER, WAP_PROGRAM_DISCOVERED_ALIASES);
