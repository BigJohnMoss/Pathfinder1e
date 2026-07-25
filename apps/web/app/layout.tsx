import "./styles.css";
import "./skill-allocation.css";
import "./character-actions.css";
import "./class-options.css";
import "./domain-details.css";
import "./domain-slots.css";
import "./channel-energy.css";
export const metadata={title:"PF1e Builder",description:"Data-first Pathfinder 1e character builder"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
