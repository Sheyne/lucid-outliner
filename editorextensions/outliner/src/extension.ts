import { BlockProxy, DocumentProxy, EditorClient, Menu, MenuType, Modal } from 'lucid-extension-sdk';
import type { Schema$Document } from './googleapispec';

const client = new EditorClient();
const menu = new Menu(client);


class Node {
    public nodes: Node[] = [];
    constructor(public readonly value: string, public readonly level: number) { }

    add(value: string, level: number) {
        if (this.nodes.length === 0 || level === this.nodes[0].level) {
            this.nodes.push(new Node(value, level));
        } else {
            this.nodes[this.nodes.length - 1].add(value, level);
        }
    }

    *dfs(): Iterable<Node> {
        yield this;
        for (const node of this.nodes) {
            yield* node.dfs();
        }
    }
}

const levelSequence = ["TITLE", "HEADING_1", "HEADING_2", "HEADING_3", "HEADING_4", "HEADING_5", "HEADING_6", "NORMAL_TEXT"];

function parse(x: Schema$Document) {
    let tree: Node | undefined = undefined;

    for (const element of x.body?.content ?? []) {
        for (const paragraph of element.paragraph?.elements ?? []) {
            if (paragraph.textRun?.content) {
                const level = levelSequence.indexOf(element.paragraph?.paragraphStyle?.namedStyleType ?? "NORMAL_TEXT")
                if (tree) {
                    tree.add(paragraph.textRun.content, level);
                } else {
                    tree = new Node(paragraph.textRun.content, level);
                }
            }
        }
    }

    return tree;
}

async function layout(node: Node) {
    const document = new DocumentProxy(client);
    const page = document.pages.first()!;
    await client.loadBlockClasses(['ProcessBlock']);

    const nodeMap = new Map<Node, BlockProxy>();

    const occupiedLevels = new Set<number>();
    for (const child of node.dfs()) {
        occupiedLevels.add(child.level);
    }
    const sortedOccupiedLevels = [...occupiedLevels].sort();
    const levelStarts = new Map<number, number>();

    console.log(node);

    for (const child of node.dfs()) {
        const start = levelStarts.get(child.level) ?? 0;
        levelStarts.set(child.level, start + 1);
        const block = page.addBlock({ className: "ProcessBlock", boundingBox: { x: 250 * start, y: sortedOccupiedLevels.indexOf(child.level) * 150, w: 200, h: 80 } });
        block.textAreas.set('Text', child.value);
        nodeMap.set(child, block);
    }

    for (const parent of node.dfs()) {
        for (const child of parent.nodes) {
            const parentBlock = nodeMap.get(parent)!;
            const childBlock = nodeMap.get(child)!;

            page.addLine({ endpoint1: { connection: parentBlock, linkX: 0.5, linkY: 1 }, endpoint2: { connection: childBlock, linkX: 0.5, linkY: 0 } })
        }
    }
}

client.registerAction('test', async () => {
    const documentId = "1ssftMb28YiDuxhI232rXFwqK4sJ5vYsopKhGBOEYt6g"

    const documentContent = await client.oauthXhr('google', {
        method: "GET",
        url: `https://docs.googleapis.com/v1/documents/${documentId}`,
    })

    if (documentContent.responseFormat === "utf8") {
        const response = JSON.parse(documentContent.responseText);

        const tree = parse(response);
        if (tree) {
            await layout(tree);
        }
    }
});

menu.addMenuItem({
    label: 'Test thing 2',
    action: 'test',
    menuType: MenuType.Main,
});
