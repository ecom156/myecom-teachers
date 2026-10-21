export type NavItem = { label: string; href: string; children?: NavItem[] };

export const nav: NavItem[] = [
  { label: 'Home', href: '/teachers/' },
  {
    label: 'School Introduction',
    href: '/teachers/school_introduction/',
    children: [{ label: 'Data of our teachers', href: '/teachers/school_introduction/data-teachers/' }],
  },
  {
    label: 'Careers',
    href: '/teachers/careers/',
    children: [
      { label: 'About online teaching', href: '/teachers/online-teaching/' },
      { label: 'Online English Teacher (home-based)', href: '/teachers/careers/online_english_teacher/' },
      { label: 'Collaborative School Classes with Japanese', href: '/teachers/careers/collaborative-classes/' },
      { label: 'Online Spanish Teacher (home-based)', href: '/teachers/careers/online-spanish-teacher-home-based/' },
      { label: 'Online Russian Teacher', href: '/teachers/careers/online-russian-teacher-home-based/' },
      { label: 'Online French Teacher', href: '/teachers/careers/online-french-teacher-home-based/' },
      { label: 'Online German Teacher', href: '/teachers/careers/german-teachers-rec/' },
    ],
  },
  {
    label: 'Why ECOM?',
    href: '/teachers/careers/teachersurvey/',
    children: [{ label: 'Top 5 Reasons for English Teachers Choosing Ecom', href: '/teachers/careers/teachersurvey/' }],
  },
  { label: 'Apply', href: '/teachers/form/' },
  { label: 'FAQ', href: '/teachers/faq/' },
  { label: 'About Us and Contact', href: '/teachers/contact-form/' },
];
