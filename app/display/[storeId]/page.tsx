import { DisplayScreen } from '@/components/display/DisplayScreen'

export default async function DisplayPage({
  params,
}: {
  params: Promise<{ storeId: string }>
}) {
  const { storeId } = await params
  return <DisplayScreen storeId={storeId} />
}