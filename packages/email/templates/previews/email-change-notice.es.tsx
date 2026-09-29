import { emailChangeNoticePreviewData } from "../../preview-data";
import EmailChangeNoticeEmail from "../email-change-notice";

const EmailChangeNoticeEmailEs = () => (
    <EmailChangeNoticeEmail data={emailChangeNoticePreviewData} locale="es" />
);

export default EmailChangeNoticeEmailEs;
