import vishnu from "@/assets/team/vishnu.jpg";
import gayathri from "@/assets/team/gayathri.jpg";
import vivek from "@/assets/team/vivek.jpg";
import sinoy from "@/assets/team/sinoy.jpg";
import sreejith from "@/assets/team/sreejith.jpg";
import yadhu from "@/assets/team/yadhu.jpg";
import sreerag from "@/assets/team/sreerag.png";
import shawn from "@/assets/team/shawn.jpg";
import aadithyan from "@/assets/team/aadithyan.jpg";
import jishnu from "@/assets/team/jishnu.jpg";
import dileepPd from "@/assets/team/dileep-pd.jpg";

export type PlatformTeamMember = {
  name: string;
  role: string;
  image: string;
};

/** Photos shown in “The people behind the platform” and on the Team page. */
export const platformTeam: PlatformTeamMember[] = [
  { name: "Sreerag", role: "Fullstack Developer", image: sreerag },
  { name: "Vishnu", role: "Fullstack Developer · Sales", image: vishnu },
  { name: "Vivek", role: "Fullstack Developer", image: vivek },
  { name: "Gayathri", role: "QA Engineer", image: gayathri },
  { name: "Jishnu", role: "QA Engineer", image: jishnu },
  { name: "Sreejith", role: "Senior Developer · Fullstack", image: sreejith },
  { name: "Sinoy Devassy", role: "Senior Developer · .NET", image: sinoy },
  { name: "Yadhu", role: "UI/UX Designer", image: yadhu },
  { name: "Aadithyan", role: "Frontend Developer", image: aadithyan },
  { name: "Shawn", role: "Business and Marketing Executive", image: shawn },
  { name: "Dileep PD", role: "Support Engineer", image: dileepPd },
];
