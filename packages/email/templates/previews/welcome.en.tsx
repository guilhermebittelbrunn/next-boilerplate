import { welcomePreviewData } from "../../preview-data";
import WelcomeEmail from "../welcome";

const WelcomeEmailEn = () => (
    <WelcomeEmail data={welcomePreviewData} locale="en" />
);

export default WelcomeEmailEn;
