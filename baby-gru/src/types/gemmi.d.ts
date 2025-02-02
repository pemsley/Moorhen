import { emscriptem } from "./emscriptem"

export namespace gemmi {
    interface NeighborSearch extends emscriptem.instance<NeighborSearch> {
        populate: (arg0: boolean) => void;
        find_atoms: (arg0: Position, arg1: number, arg2: number) => emscriptem.vector<Mark>
    }
    interface Mark extends emscriptem.instance<Mark> {
        x: number;
        y: number;
        z: number;
        altloc: number;
        element: emscriptem.instance<string>;
        chain_idx: number;
        residue_idx: number;
        atom_idx: number;
        image_idx: number;
        pos: () => Position;
    }
    interface Position extends emscriptem.instance<Position> {

    }
    interface Selection extends emscriptem.instance<Selection> {
        matches_model: (model: Model) => boolean;
        matches_chain: (chain: Chain) => boolean;
        matches_residue: (residue: Residue) => boolean;
        matches_atom: (atom: Atom) => boolean;
        chain_ids: SelectionChainList;
        to_seqid: SelectionSeqId;
        from_seqid: SelectionSeqId;
    }
    interface SelectionChainList extends emscriptem.instance<SelectionChainList> {
        str: () => string;
        all: boolean;
    }
    interface SelectionSeqId extends emscriptem.instance<SelectionSeqId> {
        str: () => string;
        empty: () => boolean;
        seqnum: number;
    }
    interface Atom extends emscriptem.instance<Atom> {
        name: string;
        element: emscriptem.instance<string>;
        pos: { x: number, y: number, z: number, delete: () => void };
        altloc: number;
        charge: number;
        b_iso: number;
        serial: string;
        has_altloc: () => boolean;
    }
    interface ResidueSeqId extends emscriptem.instance<ResidueSeqId> {
        str: () => string;
        num: { value: number };
    }
    interface Residue extends emscriptem.instance<Residue> {
        name: string;
        seqid: ResidueSeqId;
        atoms: emscriptem.vector<Atom>;
    }
    interface Chain extends emscriptem.instance<Chain> {
        residues: emscriptem.vector<Residue>;
        name: string;
        get_ligands: () => emscriptem.vector<Residue>;
        get_polymer_const: () => emscriptem.instance<number>;
        get_ligands_const: () => emscriptem.vector<Residue>;
    }
    interface Model extends emscriptem.instance<Model> {
        name: string;
        chains: emscriptem.vector<Chain>;
    }
    interface UnitCell extends emscriptem.instance<UnitCell> {
        a: number;
        b: number;
        c: number;
        alpha: number;
        beta: number;
        gamma: number;
        set: (a: number, b: number, c: number, alpha: number, beta: number, gamma: number) => void
    }
    interface Structure extends emscriptem.instance<Structure> {
        models: emscriptem.vector<Model>;
        cell: UnitCell;
        first_model: () => Model;
    }

}