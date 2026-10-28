// A deliberately small formatting subset. React escapes all text; no HTML or URLs execute.
function emphasis(text) {
    return text.split(/(\*\*[^*\n]+\*\*)/g).map((part, index) => part.startsWith('**') && part.endsWith('**')
        ? <strong key={index}>{part.slice(2, -2)}</strong> : part)
}

export default function StudyContent({ content }) {
    const blocks = []
    let paragraph = []
    let bullets = []
    const flush = () => {
        if (paragraph.length) blocks.push(<p key={blocks.length}>{emphasis(paragraph.join(' '))}</p>)
        if (bullets.length) blocks.push(<ul key={blocks.length}>{bullets.map((item, index) => <li key={index}>{emphasis(item)}</li>)}</ul>)
        paragraph = []
        bullets = []
    }
    for (const line of (content || '').split(/\r?\n/)) {
        const heading = /^#{1,3}\s+(.+)$/.exec(line.trim())
        const bullet = /^[-*]\s+(.+)$/.exec(line.trim())
        if (heading) { flush(); blocks.push(<h3 key={blocks.length}>{emphasis(heading[1])}</h3>) }
        else if (bullet) { if (paragraph.length) flush(); bullets.push(bullet[1]) }
        else if (!line.trim()) flush()
        else { if (bullets.length) flush(); paragraph.push(line.trim()) }
    }
    flush()
    return <div className="study-content">{blocks}</div>
}
