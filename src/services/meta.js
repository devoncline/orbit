export async function analyzeCourseFile(file) {
  const base64File = await fileToBase64(file)

  const response = await fetch('/api/analyze-course', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      fileData: base64File,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to analyze course file')
  }

  return response.json()
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      resolve(reader.result)
    }

    reader.onerror = reject

    reader.readAsDataURL(file)
  })
}