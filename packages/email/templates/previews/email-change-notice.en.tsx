import { emailChangeNoticePreviewData } from "../../preview-data";
import EmailChangeNoticeEmail from "../email-change-notice";

const EmailChangeNoticeEmailEn = () => (
    <EmailChangeNoticeEmail data={emailChangeNoticePreviewData} locale="en" />
);

export default EmailChangeNoticeEmailEn;
