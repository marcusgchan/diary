import { Book } from "../Book";
import { EditMapForm } from "./EditMapForm";

export default function EditMapPage() {
  return <Book leftPageContent={<EditMapForm />} />;
}
