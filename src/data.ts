import { NavigationMenu, ProgramCard, ImpactStory, DonationTier } from "./types";

export const NAVIGATION_DATA: NavigationMenu = {
  home: {
    label: "Home",
    hasMega: false,
    href: "#home"
  },
  whoWeAre: {
    label: "Who We Are",
    hasMega: true,
    href: "#about",
    columns: [
      {
        title: "Who We Are",
        items: [
          { label: "About Us", href: "#about", description: "Our history, founders, and international presence.", iconName: "Building2" },
          { label: "Mission & Vision", href: "#mission-vision", description: "Adding value to Africa's development.", iconName: "Compass" },
          { label: "Leadership", href: "#leadership", description: "Meet our global experts and local execution team.", iconName: "Users" },
          { label: "Core Values", href: "#core-values", description: "Integrity, innovation, empowerment, and impact.", iconName: "Shield" }
        ]
      }
    ]
  },
  programs: {
    label: "Programs",
    hasMega: true,
    href: "#programs",
    columns: [
      {
        title: "Focus Areas",
        items: [
          { label: "Youth Empowerment", href: "#programs?category=youth", description: "Skills, technology training & leadership labs.", iconName: "TrendingUp" },
          { label: "Education Initiatives", href: "#programs?category=education", description: "Shaping the future through standard education.", iconName: "GraduationCap" },
          { label: "Health Programs", href: "#programs?category=health", description: "Access to clean water, clinics, & wellness coaching.", iconName: "Heart" }
        ]
      },
      {
        title: "Sustainable Dev",
        items: [
          { label: "Housing Projects", href: "#programs?category=housing", description: "Constructing safe, modern, and affordable houses.", iconName: "Home" },
          { label: "Community Development", href: "#programs?category=community", description: "Eco-friendly, self-sustaining community grids.", iconName: "Globe" }
        ]
      }
    ]
  },
  impactStories: {
    label: "Impact Stories",
    hasMega: true,
    href: "#story",
    columns: [
      {
        title: "The Change We Make",
        items: [
          { label: "Success Stories", href: "#story", description: "Voices from the ground changing their destiny.", iconName: "Sparkles" },
          { label: "Community Highlights", href: "#story?view=highlights", description: "Transforming rural areas into economic hubs.", iconName: "Award" },
          { label: "Annual Reports", href: "#annual-reports", description: "Transparencies & audited accounts of our works.", iconName: "FileSpreadsheet" }
        ]
      }
    ]
  },
  media: {
    label: "Media",
    hasMega: true,
    href: "#media",
    columns: [
      {
        title: "Press & Dynamic Assets",
        items: [
          { label: "Photo Gallery", href: "#gallery", description: "High-definition snapshots of ongoing fieldworks.", iconName: "Image" },
          { label: "Documentaries", href: "#videos", description: "Impact documentaries and project walk-throughs.", iconName: "Video" },
          { label: "Press Releases", href: "#press", description: "Official announcements of new policy implementations.", iconName: "FileText" }
        ]
      }
    ]
  },
  getInvolved: {
    label: "Get Involved",
    hasMega: true,
    href: "#ambassador",
    columns: [
      {
        title: "How to Support",
        items: [
          { label: "Volunteer", href: "#ambassador?role=volunteer", description: "Lend your expertise on the ground.", iconName: "HandHelping" },
          { label: "Donate Now", href: "#donate", description: "Power our active projects directly.", iconName: "Coins" },
          { label: "Become Ambassador", href: "#ambassador", description: "Be a global voice of Advaltad.", iconName: "UserCheck" },
          { label: "Partner With Us", href: "#partner", description: "Institutional or corporate synergy.", iconName: "HeartHandshake" }
        ]
      }
    ]
  }
};

export const PROGRAM_CARDS: ProgramCard[] = [
  {
    id: "youth-empowerment",
    category: "YOUTH EMPOWERMENT",
    title: "Youth Tech-Hubs & Accelerator",
    description: "Establishing standard technical labs providing high-demand training in software development, design, and micro-entrepreneurship for Africa's energetic youth.",
    impactMetric: "12,500+ Graduates Certified",
    iconName: "Cpu",
    image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=1200"
  },
  {
    id: "education",
    category: "EDUCATION & LITERACY",
    title: "NextGen Scholarship & Literacy",
    description: "Rehabilitating public schools, distributing modernized digital learning modules, and granting fully-funded scholarships to exceptional underprivileged kids.",
    impactMetric: "85 Schools Supported",
    iconName: "GraduationCap",
    image: "https://images.unsplash.com/photo-1588072432836-e10032774350?q=80&w=1200"
  },
  {
    id: "humanitarian-housing",
    category: "HUMANITARIAN HOUSING",
    title: "Eco-Adobe Sustainable Shelter",
    description: "Building resilient micro-housing using safe, locally-sourced materials, providing dignity and clean sanitation facilities for displaced families.",
    impactMetric: "450 Families Re-homed",
    iconName: "Home",
    image: "https://images.unsplash.com/photo-1590001155093-a3c66ab0c3ff?q=80&w=1200"
  },
  {
    id: "community-dev",
    category: "COMMUNITY DEVELOPMENT",
    title: "Sovereign Green Power Grids",
    description: "Delivering community solar grids and drilling hybrid solarboreholes for clean drinking water to jumpstart localized agricultural cooperatives.",
    impactMetric: "32 Off-grid Communities Powered",
    iconName: "Lightbulb",
    image: "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?q=80&w=1200"
  },
  {
    id: "health-wellbeing",
    category: "HEALTH & WELLBEING",
    title: "Mobile Clinics & Clean Living Hubs",
    description: "Bridging the accessibility gap with fully equipped mobile clinic networks and wellness centers specializing in preventive medicine and maternal hygiene instruction.",
    impactMetric: "48,000+ Health Interventions",
    iconName: "HeartPulse",
    image: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?q=80&w=1200"
  }
];

export const IMPACT_STORIES: ImpactStory[] = [
  {
    id: "story-1",
    tag: "EDUCATION & TECH EXCELLENCE",
    title: "From Code-Block to Career: Chidi’s Path to Global Innovation",
    excerpt: "Growing up in Enugu, Chidi had no access to a computer. At 19, he discovered the Advaltad TechHub Accelerator, changing his trajectory forever.",
    fullStory: "Chidi grew up in a vibrant but under-resourced suburb of Enugu, Nigeria, where electricity was scarce and personal computers were a luxury reserved for the few. At 19, after completing secondary school with excellent marks but zero options for self-advancement, he is the perfect target for Advaltad's Tech-Hub Initiative. Here, Chidi was fully sponsored through a rigorous 9-month immersive program in Full-Stack Software Engineering. Empowered with modern hardware and direct tutelage from global industry volunteers, Chidi didn't just learn node and react — he designed ‘FarmSettle’, a localized marketplace app that has since helped standard agricultural cooperatives in his community trade. Today, he works as a remote developer for an international green tech organization, directly funding his younger siblings' secondary education.",
    location: "Enugu, Nigeria",
    author: "Advaltad Media Core",
    date: "April 14, 2026",
    image: "https://images.unsplash.com/photo-1544256718-3bcf237f3974?q=80&w=1200"
  },
  {
    id: "story-2",
    tag: "SUSTAINABLE COMMUNITY SHELTER",
    title: "Constructing Safety and Stability for Mama Fatima's Family",
    excerpt: "Displaced by flash floods, Fatima and her four kids survived in temporary high-tension tarpaulins until Advaltad's Humanitarian Housing team stepped in.",
    fullStory: "Our Eco-Adobe Sustainable Shelter project is rooted in the belief that secure housing is a basic human right. Mama Fatima was one of hundreds of climate-displaced citizens living in extreme conditions near standard waterways in coastal regions. In under 18 days, utilizing our innovative compressed earth block system which boasts a zero-carbon production rate, our volunteers constructed a neat 3-room housing unit complete with localized solar lanterns and micro-flush toilet mechanisms. This stable foundation allows Fatima to re-establish her tailoring workspace from home, bringing safety, power, and long-term self-reliance to an entire household.",
    location: "Mombasa, Kenya",
    author: "Grace Adebayo, Field Architect",
    date: "March 22, 2026",
    image: "https://images.unsplash.com/photo-1590001155093-a3c66ab0c3ff?q=80&w=1200"
  }
];

export const DONATION_TIERS: DonationTier[] = [
  {
    amount: 25,
    label: "Education Catalyst",
    description: "Perfect for sponsoring scholastic toolbags and classroom kits for three young learners.",
    impactStatement: "Provides standard books, writing utensils, and solar study lamps for 3 kids."
  },
  {
    amount: 100,
    label: "Youth Tech Sponsor",
    description: "Empowers Africa’s youth with software design software licenses and professional tutors.",
    impactStatement: "Funds 1 month of developer laboratory coaching and internet access for 2 trainees."
  },
  {
    amount: 250,
    label: "Clean Water Advocate",
    description: "Finances pipe installations and community solar water pumps for remote families.",
    impactStatement: "Provides clean water for 15 individuals for over 10 years via standard filtration grids."
  },
  {
    amount: 750,
    label: "Humanitarian Builder",
    description: "Directly funds materials needed to craft sustainable Eco-Adobe housing for displaced households.",
    impactStatement: "Covers compressed-earth masonry and steel roofing materials for a family shelter."
  }
];
