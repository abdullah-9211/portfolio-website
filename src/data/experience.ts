export type ExperienceRow = {
  range: string;
  role: string;
  company: string;
  location: string;
  current?: boolean;
  narrative: string;
};

export const experienceRows: ExperienceRow[] = [
  {
    range: "Dec 2025 — Present",
    role: "Software Development Engineer",
    company: "Veeam Software",
    location: "Islamabad, Pakistan",
    current: true,
    narrative:
      "Working on integration of backup and snapshot policies into the product, ingestion of Veeam's backup-system audit and event logs into the UI, and a new threat-detection framework — ingesting threat logs straight from the product side.",
  },
  {
    range: "Jul 2025 — Dec 2025",
    role: "Software Development Engineer",
    company: "Securiti.ai",
    location: "Islamabad, Pakistan",
    narrative:
      "Built integration for data access control of Ranger-based systems — Apache Trino, Presto, Starburst. Worked with the Quarantine team to shorten operational turnaround, and revamped the Data Labeling Policy flow to a newer approach that cut processing time for customers.",
  },
  {
    range: "Jun 2024 — Jul 2025",
    role: "Associate Software Development Engineer",
    company: "Securiti.ai",
    location: "Islamabad, Pakistan",
    narrative:
      "Part of the Back End Data Access Control Policy team — helped develop and maintain data-access-governance features over Sharepoint, Databricks, and Snowflake, including a Backup and Restore feature for Databricks and Snowflake access policies.",
  },
];

export const acquisition = {
  amount: "$1.725B",
  headline: "Veeam Software acquired Securiti",
  date: "December 2025",
  body: "“The industry’s first trusted data platform for accelerating safe AI at scale” — Veeam’s Data Resilience platform combined with Securiti’s data security, governance, and AI Trust platform. The team and the codebase carried straight through. Not a job change — the same work, under a new name.",
  quote:
    "Excited to share that Securiti has officially become part of Veeam Software after a $1.725B acquisition... On the Data Access Control team, I've been working on rolling out features for policy and access-control features across structured and unstructured data, while also helping out on the File Policies side.",
};
