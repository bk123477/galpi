export const MAX_SOURCE_SIZE = 12 * 1024 * 1024
export const MAX_COVER_SIZE = 3 * 1024 * 1024

export function resizedDimensions(width: number, height: number) {
  const ratio = Math.min(1, 1400 / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  }
}
export async function compressCover(file: File): Promise<Blob> {
  if (file.size > MAX_SOURCE_SIZE)
    throw new Error('원본 이미지는 12MB 이하로 선택해 주세요.')
  if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name))
    throw new Error('이미지 파일을 선택해 주세요.')
  const url = URL.createObjectURL(file)
  const image = new Image()
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () =>
        reject(
          new Error(
            '이 사진 형식을 읽을 수 없어요. 사진을 JPEG 또는 PNG로 변환해 다시 선택해 주세요.',
          ),
        )
      image.src = url
    })
    const canvas = document.createElement('canvas')
    const size = resizedDimensions(image.naturalWidth, image.naturalHeight)
    canvas.width = size.width
    canvas.height = size.height
    const ctx = canvas.getContext('2d')
    if (!ctx)
      throw new Error(
        '이미지를 처리할 수 없어요. 다른 사진으로 다시 시도해 주세요.',
      )
    ctx.fillStyle = '#fffefb'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    const encode = (type: string) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.83))
    let blob = await encode('image/webp')
    if (!blob || !['image/webp', 'image/jpeg', 'image/png'].includes(blob.type))
      blob = await encode('image/jpeg')
    if (!blob || blob.size > MAX_COVER_SIZE || !blob.size)
      throw new Error(
        '표지를 3MB 이하로 줄이지 못했어요. 더 작은 사진을 선택해 주세요.',
      )
    return blob
  } finally {
    URL.revokeObjectURL(url)
  }
}
