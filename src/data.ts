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
        title: "Youth, Education & Support",
        items: [
          { label: "Enriching African youths initiative", href: "#programs?category=youth", description: "Practical vocational training, tech, and software skills.", iconName: "Cpu" },
          { label: "Schools (Stem and Robotic education)", href: "#programs?category=schools", description: "Robotics and STEM integration in regional schools.", iconName: "GraduationCap" },
          { label: "Teen club", href: "#programs?category=teen-club", description: "Mentorship and safe, creative hubs for growing teenagers.", iconName: "Users" },
          { label: "Sponsorship", href: "#programs?category=sponsorship", description: "Direct support connecting donors to vulnerable children.", iconName: "Heart" }
        ]
      },
      {
        title: "Sustainability & Relief",
        items: [
          { label: "Green/Agriculture", href: "#programs?category=green-agri", description: "Climate-smart seeds, water boreholes, and agritech.", iconName: "Globe" },
          { label: "Humanitarian housing scheme", href: "#programs?category=housing", description: "Dignified eco-adobe shelter for climate-displaced families.", iconName: "Home" },
          { label: "Emergency relief", href: "#programs?category=relief", description: "Rapid distribution of hygiene, water, food, and first-aid packs.", iconName: "AlertCircle" },
          { label: "Care for the aged", href: "#programs?category=aged-care", description: "Mobile clinical checkups and nutrition for senior citizens.", iconName: "HeartHandshake" }
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
    title: "Enriching African youths initiative",
    description: "Equipping the next generation of African leaders with practical vocational training, high-demand software development modules, digital engineering skills, and creative business bootcamps to build self-reliance.",
    impactMetric: "12,500+ Youths Graduated",
    iconName: "Cpu",
    image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=1200"
  },
  {
    id: "schools-stem",
    category: "EDUCATION & TECHNOLOGY",
    title: "Schools (Stem and Robotic education)",
    description: "Integrating world-class robotics instruction, artificial intelligence workshops, and practical Science, Technology, Engineering, and Math curricula into underprivileged public and regional schools across Sub-Saharan climates.",
    impactMetric: "85 Schools Standardized",
    iconName: "GraduationCap",
    image: "https://images.unsplash.com/photo-1544256718-3bcf237f3974?q=80&w=1200"
  },
  {
    id: "green-agri",
    category: "AGRICULTURE & ENVIRONMENT",
    title: "Green/Agriculture",
    description: "Empowering rural agrarian cooperatives with climate-smart seeds, hybrid solar-powered irrigation wells, sustainable land-handling training, and modern agritech utilities.",
    impactMetric: "42 Active Agritech Hubs",
    iconName: "Globe",
    image: "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?q=80&w=1200"
  },
  {
    id: "housing",
    category: "HUMANITARIAN HOUSING",
    title: "Humanitarian housing scheme",
    description: "Constructing safe, climate-resilient, energy-efficient housing modules using eco-adobe masonry and integrated solar panels, restoring dignity for displaced communities.",
    impactMetric: "450+ Solid Shelter Blocks Handed Over",
    iconName: "Home",
    image: "https://images.unsplash.com/photo-1590001155093-a3c66ab0c3ff?q=80&w=1200"
  },
  {
    id: "teen-club",
    category: "COMMUNITY & TEENS",
    title: "Teen club",
    description: "Constructive spaces nurturing young teens through positive life skills, leadership coaching, dynamic arts, creative expression, and high-quality educational mentorship.",
    impactMetric: "3,200+ Active Teen Members",
    iconName: "Users",
    image: "https://images.unsplash.com/photo-1509099836639-18ba1795216d?q=80&w=1200"
  },
  {
    id: "sponsorship",
    category: "INDIVIDUAL SPONSORSHIP",
    title: "Sponsorship",
    description: "Direct sponsorship pathways connecting local children, orphans, and vulnerable scholars directly to sponsors to guarantee school tuition, medical support, clothing, and books.",
    impactMetric: "1,500+ Vulnerable Children Sponsored",
    iconName: "Heart",
    image: "https://images.unsplash.com/photo-1588072432836-e10032774350?q=80&w=1200"
  },
  {
    id: "relief",
    category: "EMERGENCY RELIEF",
    title: "Emergency relief",
    description: "Rapid disaster response teams delivering vital supplies, medical aid kits, clean water filters, and instant hygiene resources to emergency and drought-affected zones.",
    impactMetric: "60,000+ Direct Care Interventions",
    iconName: "AlertCircle",
    image: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?q=80&w=1200"
  },
  {
    id: "aged-care",
    category: "SENIOR WELFARE",
    title: "Care for the aged",
    description: "Dedicated outreach supplying nutritional food packages, preventative health assessments, homecare logistics, and community assistance for lonely senior citizens.",
    impactMetric: "2,800+ Senior Citizens Supported",
    iconName: "HeartHandshake",
    image: "https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?q=80&w=2000"
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
