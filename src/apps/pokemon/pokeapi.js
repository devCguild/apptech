import { API } from "../../api.js";

// 같은 포켓몬을 다시 부르지 않도록 요청(Promise)을 id별로 보관한다
const cache = new Map();

async function getJson(url) {
  const res = await fetch(url); // 🔌 API 호출
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function nameIn(species, lang) {
  return species.names.find((n) => n.language.name === lang)?.name ?? null;
}

// { id, imageUrl, names: { ko, en } }
export function fetchPokemon(id) {
  if (!cache.has(id)) {
    const request = Promise.all([
      getJson(`${API.pokemon}${id}`),
      getJson(`${API.pokemonSpecies}${id}`),
    ]).then(([pokemon, species]) => ({
      id,
      imageUrl: pokemon.sprites.other["official-artwork"].front_default,
      names: { ko: nameIn(species, "ko"), en: nameIn(species, "en") },
    }));
    // 실패한 요청은 지워서 다시 시도할 수 있게 한다
    request.catch(() => cache.delete(id));
    cache.set(id, request);
  }
  return cache.get(id);
}

// 이미 받아 둔 포켓몬이면 바로 돌려준다 (없으면 undefined)
const ready = new Map();

// 다음 문제를 미리 받아 두고, 이미지도 미리 디코딩해 바로 보이게 한다
export function preloadPokemon(id) {
  return fetchPokemon(id)
    .then(async (pokemon) => {
      const img = new Image();
      img.src = pokemon.imageUrl;
      await img.decode();
      ready.set(id, pokemon);
    })
    .catch(() => {}); // 미리 받기가 실패하면 문제를 넘길 때 다시 부른다
}

export function peekPokemon(id) {
  return ready.get(id);
}
