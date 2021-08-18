import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const produtosAtualizados = [...cart];

      const produtoExiste = produtosAtualizados.find(product => product.id === productId);
      const estoque = await api.get(`/stock/${productId}`);

      const quantidadeEstoque = estoque.data.amount;
      const quantidadeAtual   = produtoExiste ? produtoExiste.amount : 0;
      const quantidade        = quantidadeAtual + 1;

      if ( quantidade > quantidadeEstoque ) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (produtoExiste) {
        produtoExiste.amount = quantidade;
      }
      else {
        const product = await api.get(`/products/${productId}`);

        const novoProduto = {
          ...product.data,
          amount: 1
        }

        produtosAtualizados.push(novoProduto);
      }

      setCart(produtosAtualizados);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(produtosAtualizados));

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const listaAtualizada = [...cart];
      const produtoRemovido = listaAtualizada.findIndex(product => product.id === productId );
      if ( produtoRemovido >= 0 ) {
        listaAtualizada.splice(produtoRemovido, 1);
        setCart(listaAtualizada);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(listaAtualizada));
      }
      else {
        throw new Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if ( amount <= 0 ) {
        return;
      }

      const stock = await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount;

      if (amount >= stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = [...cart];
      const productExist = updatedCart.find(product => product.id === productId)
      
      if (productExist) {
        productExist.amount = amount
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      }
      else {
        throw new Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
