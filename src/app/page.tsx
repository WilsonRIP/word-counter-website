import WordCounter from './components/WordCounter'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start bg-gray-50 p-4 md:p-12 dark:bg-gray-900">
      <WordCounter />
    </main>
  )
}
