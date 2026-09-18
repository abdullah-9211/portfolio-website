export type Certification = {
  name: string;
  issuer: "Coursera" | "Udemy";
  range?: string;
  href: string;
};

export const certifications: Certification[] = [
  {
    name: "Machine Learning Specialization",
    issuer: "Coursera",
    range: "Jun 2023 — Jul 2023",
    href: "https://coursera.org/share/5d9731da9b02305f52711250cc01746e",
  },
  {
    name: "Deep Learning Specialization",
    issuer: "Coursera",
    range: "Dec 2024 — Feb 2025",
    href: "https://www.coursera.org/account/accomplishments/specialization/7PAVD4CDH2Q7",
  },
  {
    name: "Generative AI for Software Development",
    issuer: "Coursera",
    href: "https://coursera.org/share/d567836b6a3bb9a1ce227a58fb47bd18",
  },
  {
    name: "Google Data Analytics Specialization",
    issuer: "Coursera",
    href: "https://coursera.org/share/eac39d5112a6def1b99cb96baa758b6a",
  },
  {
    name: "Python for Everybody",
    issuer: "Coursera",
    href: "https://www.coursera.org/account/accomplishments/certificate/AZB9PZ3FAYT5",
  },
  {
    name: "Docker and Kubernetes",
    issuer: "Udemy",
    range: "Sep 2024 — Oct 2024",
    href: "https://www.udemy.com/certificate/UC-ee12e2dd-c19b-4dd1-97b3-0cbe5c4e6c63/",
  },
  {
    name: "SQL — The Complete Developer's Guide (MySQL, PostgreSQL)",
    issuer: "Udemy",
    range: "Nov 2024 — Dec 2024",
    href: "https://www.udemy.com/certificate/UC-00508e1e-a3ba-4b00-bfd1-0f03d3363d43/",
  },
];
