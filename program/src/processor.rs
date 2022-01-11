use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo}, entrypoint::ProgramResult, msg, program_error::ProgramError,
    pubkey::Pubkey,
};

use std::cmp;
use crate::error::EchoError;
use crate::instruction::EchoInstruction;
use crate::state::Echo;

pub struct Processor {}

impl Processor {
    pub fn process_instruction(
        _program_id: &Pubkey,
        _accounts: &[AccountInfo],
        instruction_data: &[u8],
    ) -> ProgramResult {
        let instruction = EchoInstruction::try_from_slice(instruction_data)
            .map_err(|_| ProgramError::InvalidInstructionData)?;

        match instruction {
            EchoInstruction::Echo { data } => {
                msg!("Instruction: Echo here!!");
                msg!("The data: {:?}", data);
                let accounts_iter = &mut _accounts.iter();
                let echo_acc = next_account_info(accounts_iter)?; 
                msg!("What is happening: {:?}", echo_acc);
                let mut echo_buffer = Echo::try_from_slice(&echo_acc.data.borrow())?;
                if (!Self::is_zero(&echo_buffer.data)) {
                    return Err(EchoError::EchoBufferNotEmpty.into())
                }
                let mut echo_data = &mut echo_acc.data.borrow_mut();
                // msg!("THE echo_BUFFER DATA: {:?}", echo_buffer.data.borrow().len());
                let len = data.len();

                let min_len = cmp::min(data.len(), echo_data.len());

                // for (place, data) in echo_data.iter_mut().zip(data.iter()) {
                //     *place = *data;
                // }

                for i in 0..min_len {
                    echo_data[i] = data[i];
                }
                // get program length
                // echo_acc.
                
                // do stuff with data 
                // echo_buffer.serialize(&mut *data)?;
                // let accounts_iter = &mut accounts.iter();
                // Self::(echo_handler(_program_id, _accounts, data));
                Ok(())
            }
            EchoInstruction::InitializeAuthorizedEcho {
                buffer_seed: _,
                buffer_size: _,
            } => {
                msg!("Instruction: InitializeAuthorizedEcho");
                Err(EchoError::NotImplemented.into())
            }
            EchoInstruction::AuthorizedEcho { data } => {
                msg!("Instruction: AuthorizedEcho");
                Err(EchoError::NotImplemented.into())
            }
            EchoInstruction::InitializeVendingMachineEcho {
                price: _,
                buffer_size: _,
            } => {
                msg!("Instruction: InitializeVendingMachineEcho");
                Err(EchoError::NotImplemented.into())
            }
            EchoInstruction::VendingMachineEcho { data: _ } => {
                msg!("Instruction: VendingMachineEcho");
                Err(EchoError::NotImplemented.into())
            }
        }
    }

    pub fn is_zero(buf: &Vec<u8>) -> bool {
        for byte in buf.into_iter() {
            if *byte != 0 {
                return false;
            }
        }
        return true;
    }
}
