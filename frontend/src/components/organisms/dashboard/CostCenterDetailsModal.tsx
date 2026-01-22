import { DashboardStatsTable } from './DashboardStatsTable'
import type { DashboardStats } from '../../../services/dashboard.service'
import { Button } from '../../atoms/Button'
import { Modal } from '../../molecules/Modal'

interface Props {
    isOpen: boolean
    onClose: () => void
    uniqueStats: DashboardStats[]
}

export const CostCenterDetailsModal = ({ isOpen, onClose, uniqueStats }: Props) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Detalles por Centro de Costos"
            size="full"
            footer={
                <Button variant="secondary" onClick={onClose}>
                    Cerrar
                </Button>
            }
        >
            <DashboardStatsTable stats={uniqueStats} loading={false} />
        </Modal>
    )
}
