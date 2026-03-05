export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen px-6 py-20 max-w-2xl mx-auto text-white/70 font-light">
      <h1 className="text-3xl font-light text-white mb-2 tracking-tight">Privacy Policy</h1>
      <p className="text-white/30 text-sm mb-12">Last updated: March 2025</p>

      <section className="mb-10">
        <h2 className="text-white text-lg mb-3">Overview</h2>
        <p className="leading-relaxed">
          MBTI x Pinterest is a visual personality quiz that uses images to help you discover your MBTI personality type.
          We take your privacy seriously. This policy explains what data we collect and how we use it.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-white text-lg mb-3">Data We Collect</h2>
        <ul className="space-y-3 leading-relaxed list-disc list-inside">
          <li>Your image choices during the quiz (stored temporarily in your browser session only)</li>
          <li>No account, name, email, or personal information is required or collected</li>
          <li>No cookies are set beyond what is strictly necessary to run the app</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-white text-lg mb-3">Pinterest</h2>
        <p className="leading-relaxed">
          We use the Pinterest API to display publicly available pins as image options. We do not access your Pinterest
          account, post on your behalf, or store any Pinterest user data. Image content is fetched server-side and
          displayed anonymously.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-white text-lg mb-3">How Your Data Is Used</h2>
        <p className="leading-relaxed">
          Your image selections are used solely to compute your MBTI result within the current session. This data is
          stored in your browser&apos;s sessionStorage and is automatically deleted when you close the tab. We do not
          send, sell, or share this data with any third party.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-white text-lg mb-3">Third-Party Services</h2>
        <p className="leading-relaxed">
          We use OpenAI&apos;s API to generate personality interpretations. Prompts include only abstract scene and
          aesthetic descriptions - never personal information. Please refer to{" "}
          <a href="https://openai.com/privacy" className="text-white underline underline-offset-4" target="_blank" rel="noopener noreferrer">
            OpenAI&apos;s Privacy Policy
          </a>{" "}
          for details on how they handle API data.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-white text-lg mb-3">Children&apos;s Privacy</h2>
        <p className="leading-relaxed">
          This app is not directed at children under 13. We do not knowingly collect any data from children.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-white text-lg mb-3">Changes to This Policy</h2>
        <p className="leading-relaxed">
          We may update this policy from time to time. Continued use of the app constitutes acceptance of the updated policy.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-white text-lg mb-3">Contact</h2>
        <p className="leading-relaxed">
          For any privacy-related questions, contact us at:{" "}
          <a href="mailto:edward.zehua.zhang@gmail.com" className="text-white underline underline-offset-4">
            edward.zehua.zhang@gmail.com
          </a>
        </p>
      </section>
    </main>
  );
}