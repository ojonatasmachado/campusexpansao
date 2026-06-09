export const metadata = {
  title: "Sua Vocação · CE.X",
  description: "Quiz: identifique qual dos cinco ministérios de Efésios 4:11 representa seu chamado.",
};

export default function QuizPage() {
  return (
    <iframe
      src="/quiz/index.html"
      style={{ width: "100%", height: "100vh", border: "none", display: "block" }}
      title="Quiz ·Descubra Seu Ministério"
    />
  );
}
