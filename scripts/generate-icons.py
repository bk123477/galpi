"""Generate GALPI's original bookmark icons using only the standard library."""
from pathlib import Path
import binascii
import struct
import zlib


def chunk(kind, data):
    return struct.pack('!I', len(data)) + kind + data + struct.pack('!I', binascii.crc32(kind + data) & 0xffffffff)


def icon(size):
    rows = bytearray()
    for y in range(size):
        rows.append(0)
        for x in range(size):
            px, py = x / size, y / size
            inside = .34 <= px <= .66 and .24 <= py <= .76
            notch = py > .64 + abs(px - .5) * .75
            ink = inside and not notch
            line = .41 <= px <= .59 and (.35 <= py <= .365 or .42 <= py <= .435)
            rows.extend((248, 246, 241) if ink and not line else (82, 107, 93))
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!2I5B', size, size, 8, 2, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(rows, 9)) + chunk(b'IEND', b''))


folder = Path('public/icons')
folder.mkdir(parents=True, exist_ok=True)
for name, size in [('icon-192', 192), ('icon-512', 512), ('maskable-512', 512), ('apple-touch-icon', 180)]:
    data = icon(size)
    assert struct.unpack('!2I', data[16:24]) == (size, size)
    (folder / f'{name}.png').write_bytes(data)
