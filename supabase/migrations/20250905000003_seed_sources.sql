-- Seed official technology sources (no fake articles)

insert into public.sources (name, type, url, category, fetch_interval_minutes, metadata) values
  -- AI
  ('OpenAI Blog', 'rss', 'https://openai.com/blog/rss.xml', 'AI', 120, '{"publisher":"OpenAI","official":true}'),
  ('Google AI Blog', 'rss', 'https://blog.google/technology/ai/rss/', 'AI', 120, '{"publisher":"Google","official":true}'),
  ('Anthropic News', 'rss', 'https://www.anthropic.com/news/rss.xml', 'AI', 120, '{"publisher":"Anthropic","official":true}'),
  ('Hugging Face Blog', 'rss', 'https://huggingface.co/blog/feed.xml', 'AI', 180, '{"publisher":"Hugging Face","official":true}'),
  ('Meta AI Blog', 'rss', 'https://ai.meta.com/blog/rss/', 'AI', 180, '{"publisher":"Meta","official":true}'),

  -- Development
  ('GitHub Blog', 'rss', 'https://github.blog/feed/', 'Development', 60, '{"publisher":"GitHub","official":true}'),
  ('React Blog', 'rss', 'https://react.dev/blog/rss.xml', 'Development', 240, '{"publisher":"Meta","official":true}'),
  ('Node.js Blog', 'rss', 'https://nodejs.org/en/feed/blog', 'Development', 240, '{"publisher":"OpenJS Foundation","official":true}'),
  ('TypeScript Blog', 'rss', 'https://devblogs.microsoft.com/typescript/feed/', 'Development', 240, '{"publisher":"Microsoft","official":true}'),
  ('Rust Blog', 'rss', 'https://blog.rust-lang.org/feed.xml', 'Development', 240, '{"publisher":"Rust Foundation","official":true}'),

  -- Cloud
  ('AWS News Blog', 'rss', 'https://aws.amazon.com/blogs/aws/feed/', 'Cloud', 60, '{"publisher":"Amazon Web Services","official":true}'),
  ('Google Cloud Blog', 'rss', 'https://cloud.google.com/feeds/gcp-blog.xml', 'Cloud', 120, '{"publisher":"Google Cloud","official":true}'),
  ('Microsoft Azure Blog', 'rss', 'https://azure.microsoft.com/en-us/blog/feed/', 'Cloud', 120, '{"publisher":"Microsoft","official":true}'),
  ('Cloudflare Blog', 'rss', 'https://blog.cloudflare.com/rss/', 'Cloud', 120, '{"publisher":"Cloudflare","official":true}'),

  -- Security
  ('CISA Cybersecurity Advisories', 'rss', 'https://www.cisa.gov/cybersecurity-advisories/all.xml', 'Security', 60, '{"publisher":"CISA","official":true}'),
  ('GitHub Security Advisories', 'rss', 'https://github.com/blog/security/feed', 'Security', 120, '{"publisher":"GitHub","official":true}'),
  ('NVD Recent CVEs', 'rss', 'https://nvd.nist.gov/feeds/xml/cve/misc/nvd-rss.xml', 'Security', 60, '{"publisher":"NIST","official":true}'),

  -- Developer Tools
  ('Docker Blog', 'rss', 'https://www.docker.com/blog/feed/', 'Developer Tools', 180, '{"publisher":"Docker","official":true}'),
  ('JetBrains Blog', 'rss', 'https://blog.jetbrains.com/feed/', 'Developer Tools', 180, '{"publisher":"JetBrains","official":true}'),
  ('Vercel Blog', 'rss', 'https://vercel.com/atom', 'Developer Tools', 180, '{"publisher":"Vercel","official":true}'),
  ('Supabase Blog', 'rss', 'https://supabase.com/blog/rss.xml', 'Developer Tools', 180, '{"publisher":"Supabase","official":true}'),

  -- Databases
  ('PostgreSQL News', 'rss', 'https://www.postgresql.org/news/rss/', 'Databases', 240, '{"publisher":"PostgreSQL Global Development Group","official":true}'),
  ('MongoDB Blog', 'rss', 'https://www.mongodb.com/blog/feed', 'Databases', 240, '{"publisher":"MongoDB","official":true}'),
  ('Redis Blog', 'rss', 'https://redis.io/blog/feed/', 'Databases', 240, '{"publisher":"Redis","official":true}'),

  -- Technology Industry
  ('The Verge - Tech', 'rss', 'https://www.theverge.com/rss/technology/index.xml', 'Technology Industry', 60, '{"publisher":"Vox Media","official":true}'),
  ('Ars Technica', 'rss', 'https://feeds.arstechnica.com/arstechnica/technology-lab', 'Technology Industry', 60, '{"publisher":"Condé Nast","official":true}'),
  ('TechCrunch', 'rss', 'https://techcrunch.com/feed/', 'Technology Industry', 60, '{"publisher":"TechCrunch","official":true}')
on conflict (url) do nothing;
