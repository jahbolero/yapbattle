# YapBattle: AI-Powered Debate Evaluator Using IO Intelligence

## The Problem  
Online debates often devolve into unstructured, unproductive arguments without clear conclusions or growth. There's a lack of objective scoring or constructive feedback.

## Our Solution  
YapBattle provides a platform for timed, structured debates followed by intelligent, post-debate evaluation using IO Intelligence’s Llama-4-Maverick-17B-128E-Instruct-FP8 model. It scores and analyzes full transcripts to deliver a verdict based on coherence, evidence use, rebuttals, persuasiveness, originality, and civility.

## Key Features

- **Structured Rounds**  
  3–5 rounds with 5–15 minute turns via real-time messaging (Supabase).

- **AI Evaluation (Post-Debate)**  
  Users trigger IO model evaluation. Scored on 6 criteria:  
  - Coherence  
  - Evidence  
  - Rebuttals  
  - Persuasiveness  
  - Originality  
  - Civility

- **Visual Output**  
  Verdicts, category breakdowns, progress bars, and improvement tips.

## Technical Stack

- **Frontend**: Next.js, TypeScript, Tailwind CSS  
- **Backend**: Supabase (Auth + Realtime DB)  
- **Hosting**: Vercel  
- **AI Evaluation**: IO.net's Llama-4-Maverick-17B-128E-Instruct-FP8 via Models API

## Use of IO Intelligence  
YapBattle exclusively uses IO’s Models API for AI evaluation—parsing text and generating reasoned verdicts. This demonstrates multi-step argument analysis and intelligent response generation in a collaborative, user-facing app.

## Impact & Value

- Encourages constructive discourse  
- Aids in debate skill development  
- Provides transparent and fair feedback  
- Can be expanded into educational tools, training aids, and debate simulations

## Future Roadmap

- ✅ Integrate IO's AI Agent API for real-time moderation  
- ✅ In-round AI-generated feedback  
- ✅ Fact-checking and research tool integration  
- ✅ Mobile experience & UI analytics  
- ✅ Expand formats and test scalability

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/jahbolero/yapbattle
   cd yapbattle
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Create a `.env.local` file and add the following environment variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   IONET_API_KEY=your_io_net_api_key
   ```

## Submission Assets

- **GitHub**: [https://github.com/jahbolero/yapbattle](https://github.com/jahbolero/yapbattle)  
- **Live App**: [https://yapbattle.vercel.app/](https://yapbattle.vercel.app/)  
- **Simulation Demo**: [https://yapbattle.vercel.app/io-test](https://yapbattle.vercel.app/io-test)

## Why It Matters  
YapBattle is an early prototype that creatively applies LLMs to debate analysis. It combines structured participation with intelligent feedback—showcasing how LLM APIs can foster meaningful dialogue. It lays the groundwork for future autonomous, agent-driven moderation and education platforms.